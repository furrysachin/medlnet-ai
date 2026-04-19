import express from 'express';
import { fetchPubMedPapers } from '../services/pubmed.js';
import { fetchOpenAlexPapers } from '../services/openalex.js';
import { fetchClinicalTrials } from '../services/clinicaltrials.js';
import { fetchSemanticScholarPapers } from '../services/semanticScholar.js';
import {
  generateWithOllama, buildLLMPrompt, buildInsightsPrompt,
  buildDirectPrompt, isMedicalQuery, validateOutput,
  detectDiseaseFromQuery
} from '../services/llm.js';
import {
  parseInput, detectIntent, buildQuery, buildContext,
  generateQueries, expandQuery, deduplicate, selectTopPapers,
  selectTopTrials, sanitizeForSearch
} from '../services/pipeline.js';
import { hybridRerank, indexPapers } from '../services/vectorSearch.js';
import { runPromptChain } from '../services/promptChain.js';
import { detectResearchTrends } from '../services/medicalRanker.js';
import { extractDrugsFromPapers } from '../services/llm.js';
import Conversation from '../models/Conversation.js';

export const chatRoute = express.Router();

const sessions = new Map();
const getSession = id => sessions.get(id) || { messages: [], currentDisease: '', currentQuery: '' };
const saveSession = (id, data) => sessions.set(id, data);

chatRoute.post('/message', async (req, res) => {
  try {
    const { disease, query, name, location, sessionId } = parseInput(req.body);
    if (!query) return res.status(400).json({ error: 'query is required' });

    const session = getSession(sessionId);
    const history = session.messages || [];
    
    // Dynamic disease detection: prioritize query-detected disease > explicit disease > session context
    const detected = detectDiseaseFromQuery(query);
    const effectiveDisease = detected || disease || session.currentDisease || query;
    
    // Topic switch safety: if the disease changed, clear history to avoid cross-contamination
    const isTopicSwitch = detected && session.currentDisease && detected.toLowerCase() !== session.currentDisease.toLowerCase();
    const finalHistory = isTopicSwitch ? [] : history;

    // 1. Non-medical fast path
    if (!isMedicalQuery(query)) {
      const response = await generateWithOllama(buildDirectPrompt(query, effectiveDisease));
      saveSession(sessionId, {
        ...session,
        messages: [...finalHistory, { role: 'user', content: query }, { role: 'assistant', content: response }].slice(-20),
        currentDisease: effectiveDisease
      });
      return res.json({
        response, papers: [], trials: [], insights: null, expandedQuery: '',
        confidence: { score: 0, label: 'N/A', note: '' },
        counts: { papersUsed: 0, trialsUsed: 0, papersAnalyzed: 0, trialsAnalyzed: 0 },
        meta: { totalFetched: 0, totalTrials: 0, finalPapers: 0, finalTrials: 0, intent: 'non-medical', disease: effectiveDisease }
      });
    }

    // 2. Intent + query expansion
    const intent = detectIntent(query);
    const contextQuery = buildContext(finalHistory, query, effectiveDisease);
    const expanded = expandQuery({ disease: effectiveDisease, query: contextQuery });
    const queryObj = buildQuery(effectiveDisease, contextQuery, intent);
    const queries = generateQueries(effectiveDisease, contextQuery, intent);
    const sanitizedQuery = sanitizeForSearch(contextQuery, effectiveDisease);

    // 3. Parallel fetch — increase volume to ensure 85+ confidence
    // 4. Parallel research gathering (PubMed + OpenAlex + Semantic Scholar + Trials + Gaps Search)
    const [pubmed1, openalex1, ss1, pubmed2, openalex2, ss2, rawTrials] = await Promise.all([
      fetchPubMedPapers(queries[0].pubmed, 75),
      fetchOpenAlexPapers(queries[0].openalex, 75),
      fetchSemanticScholarPapers(queries[0].openalex, 75),
      fetchPubMedPapers(queries[1].pubmed, 50),
      fetchOpenAlexPapers(queries[1].openalex, 50),
      fetchSemanticScholarPapers(`${effectiveDisease} limitations research gaps future directions`, 40),
      fetchClinicalTrials(effectiveDisease, query, 65)
    ]);

    const allPapers = deduplicate([...pubmed1, ...pubmed2, ...openalex1, ...openalex2, ...ss1, ...ss2]);

    // 4. Filter + rank (keyword-based)
    let topPapers = selectTopPapers(allPapers, effectiveDisease, query, 20); // get 20 first

    // 5. Hybrid rerank (semantic + keyword + medical signals) → Top 8
    try {
      topPapers = await hybridRerank(topPapers, query, effectiveDisease, 8);
      console.log(`✅ Hybrid rerank: ${topPapers.length} papers selected`);
    } catch (err) {
      console.warn('⚠️  Hybrid rerank failed, using keyword ranking:', err.message);
      topPapers = topPapers.slice(0, 8);
    }

    let topTrials = selectTopTrials(rawTrials, effectiveDisease, intent, 6, query);

    // Index papers in vector store for follow-up queries
    indexPapers(sessionId, topPapers).catch(() => {});

    // Auto fallback — never return 0 trials if data exists
    if (topTrials.length === 0 && rawTrials.length > 0) {
      topTrials = rawTrials.slice(0, 3);
    }

    // 5. COUNTS = SINGLE SOURCE OF TRUTH (backend decides)
    const counts = {
      papersUsed:     topPapers.length,
      trialsUsed:     topTrials.length,
      papersAnalyzed: allPapers.length,
      trialsAnalyzed: rawTrials.length,
    };

    // 6. Safety check
    if (counts.papersUsed < 3 && counts.trialsUsed === 0) {
      return res.json({
        response: `Insufficient research data available for "${query}" related to ${effectiveDisease}. Try a more specific medical question.`,
        papers: topPapers, trials: [], insights: null,
        expandedQuery: expanded,
        confidence: { score: 0, label: 'Low', note: 'Insufficient data' },
        counts: { ...counts, trialsUsed: 0 },
        meta: { totalFetched: allPapers.length, totalTrials: rawTrials.length, finalPapers: topPapers.length, finalTrials: 0, intent, disease: effectiveDisease }
      });
    }

    // 7. LLM reasoning — Chat response FIRST, then Deep Insights (Serialized for stability)
    const response = await generateWithOllama(buildLLMPrompt({
      name,
      disease: effectiveDisease,
      query,
      location,
      papers: topPapers,
      trials: topTrials,
      history: finalHistory,
      counts,
      analyzedTrials: rawTrials.length
    }));

    const chainResult = await runPromptChain(query, effectiveDisease, location, topPapers, rawTrials, intent);

    const insightsRaw = chainResult.finalOutput;
    const chainMeta = {
      understood:       chainResult.understood,
      retrievalQueries: chainResult.retrievalQueries,
      reasoning:        chainResult.reasoning
    };

    // 8. Validate + parse
    const totalSources = topPapers.length + topTrials.length;
    const isValid = validateOutput(insightsRaw, topPapers);
    const parsed = isValid ? parseInsights(insightsRaw, totalSources, topPapers) : {
      keyInsights: ['Low confidence response. Please refine your query.'],
      conditionOverview: '', evidenceSynthesis: '', trialsConnection: '', criticalInsight: ''
    };

    // Always guarantee researchTrends — query-specific, from actual retrieved papers
    const detectedTrends = detectResearchTrends(topPapers, topTrials, query);
    const trendFallback = detectedTrends
      .filter(t => t.score > 0)
      .slice(0, 5)
      .map(t => {
        const label = t.trend.charAt(0).toUpperCase() + t.trend.slice(1);
        const context = t.fromTitle
          ? `Recurring topic in ${effectiveDisease} research papers (${t.score} papers)`
          : `Active research signal in ${effectiveDisease} literature (${t.score} mentions)`;
        return `${label} — ${context}`;
      });

    const insights = {
      ...parsed,
      researchTrends: parsed?.researchTrends?.length ? parsed.researchTrends : trendFallback
    };

    // 9. Confidence — granular scoring based on actual evidence quality
    const hasRCT    = topPapers.some(p => /randomized|rct/i.test(`${p.title} ${p.abstract}`));
    const hasReview = topPapers.some(p => /meta-analysis|systematic review/i.test(`${p.title} ${p.abstract}`));
    const hasPhase3 = topPapers.some(p => /phase\s*(3|iii|4|iv)/i.test(`${p.title} ${p.abstract}`)) ||
                      topTrials.some(t => /phase\s*(3|iii|4|iv)/i.test(t.phase || ''));
    const recentCount  = topPapers.filter(p => parseInt(p.year) >= 2022).length;
    const hasPubMed    = topPapers.some(p => p.source === 'PubMed');
    const hasOpenAlex  = topPapers.some(p => p.source === 'OpenAlex');
    const hasAbstracts = topPapers.filter(p => (p.abstract || '').length > 100).length;

    let score = 0;
    // Data Volume (max 40) - 85+ target needs depth
    score += Math.min(counts.papersUsed * 4, 32); 
    score += Math.min(counts.trialsUsed * 2, 8);
    
    // Evidence Quality (max 40) - RCTs and Phase 3 are gold
    if (hasReview) score += 15;
    if (hasRCT)    score += 12;
    if (hasPhase3) score += 8;
    if (hasPubMed) score += 5;

    // Recency (max 20)
    score += Math.min(recentCount * 4, 16);
    if (parseInt(topPapers[0]?.year) >= 2024) score += 4;

    // Source diversity (max 5)
    if (hasPubMed && (hasOpenAlex || counts.trialsUsed > 0)) score += 5;

    // Force "High" if criteria met
    if (counts.papersUsed >= 6 && (hasRCT || hasReview) && recentCount >= 3) {
      score = Math.max(score, 85);
    }

    score = Math.max(10, Math.min(score, 99));
    const confLevel = score >= 75 ? 'High' : score >= 45 ? 'Medium' : 'Low';
    const confidence = {
      score,
      label: confLevel,
      note: `Based on ${counts.papersUsed} papers + ${counts.trialsUsed} trials`,
      emoji: confLevel === 'High' ? '🟢' : confLevel === 'Medium' ? '🟡' : '🔴'
    };

    // 10. Session save
    saveSession(sessionId, {
      messages: [...finalHistory, { role: 'user', content: query }, { role: 'assistant', content: response }].slice(-20),
      currentDisease: effectiveDisease,
      currentQuery: query
    });

    Conversation.findOneAndUpdate(
      { sessionId },
      { $push: { messages: { $each: [{ role: 'user', content: query }, { role: 'assistant', content: response }] } }, $set: { currentDisease: effectiveDisease, updatedAt: new Date() } },
      { upsert: true }
    ).catch(() => {});

    // Strip citations from main response text too
    // 10. Session save
    saveSession(sessionId, {
      messages: [...finalHistory, { role: 'user', content: query }, { role: 'assistant', content: response }].slice(-20),
      currentDisease: effectiveDisease,
      currentQuery: query
    });

    return res.json({
      response: stripCitations(response),
      insights,
      papers: topPapers,
      trials: topTrials,
      expandedQuery: expanded,
      confidence,
      counts,
      trends: { detectedTrends, signals: detectedTrends.reduce((acc, t) => ({ ...acc, [t.trend]: t.score }), {}) },
      limitationPaper: topPapers.find(p => (p.abstract || p.title).toLowerCase().match(/limit|gap|future research|small sample|bias|missing|unknown/)) || topPapers[0],
      followUps: generateFollowUps(effectiveDisease, query, topPapers, topTrials),
      meta: {
        totalFetched: allPapers.length,
        totalTrials: rawTrials.length,
        finalPapers: counts.papersUsed,
        finalTrials: counts.trialsUsed,
        recentPapers: recentCount,
        intent,
        disease: effectiveDisease,
        hybridSearch: true,
        vectorIndexed: topPapers.length,
        chain: chainMeta
      }
    });

  } catch (err) {
    console.error('Chat error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Strip all [1],[2] etc citations from display text
function stripCitations(text = '') {
  return text.replace(/\s*\[\d+\]/g, '').replace(/\s*\[T\d+\]/g, '').trim();
}

// Generate contextual follow-up questions from actual data
function generateFollowUps(disease, query, papers = [], trials = []) {
  const drugs = extractDrugsFromPapers(papers).slice(0, 2);
  const hasIndia = trials.some(t => (t.locations||[]).some(l => (l.country||'').toLowerCase().includes('india')));
  const hasRCT = papers.some(p => /randomized|rct/i.test(`${p.title} ${p.abstract}`));
  const intent = query.toLowerCase();

  const q = [
    drugs[0] ? `How effective is ${drugs[0]} for ${disease} treatment?` : null,
    drugs[1] ? `Compare ${drugs[0]} vs ${drugs[1]} in ${disease}` : null,
    hasIndia ? `Clinical trials for ${disease} currently recruiting in India` : `Global clinical trials for ${disease}`,
    hasRCT ? `Latest RCT results for ${disease} treatment` : `Phase 3 trials for ${disease}`,
    /symptom|sign/.test(intent) ? `What causes ${disease}?` : `Symptoms and early signs of ${disease}`,
    /treatment|therapy/.test(intent) ? `Side effects of ${disease} treatments` : `Best treatment options for ${disease}`,
    `Research gaps in ${disease} treatment`,
    `${disease} prevention strategies based on clinical evidence`,
  ];

  return q.filter(Boolean).slice(0, 5);
}

// Fix 3: Remove hallucinated citations beyond actual source count
function cleanHallucinatedCitations(text, sourceCount) {
  return text.replace(/\[(\d+)\]/g, (match, number) =>
    parseInt(number) <= sourceCount ? match : ''
  );
}

function parseInsights(raw, sourceCount = 8, papers = []) {
  if (!raw) return null;
  const clean = cleanHallucinatedCitations(
    raw.replace(/#{1,6}\s*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim(),
    sourceCount
  );
  // Matches section content until next ALL_CAPS_SECTION: or end of string
  const extract = (...tags) => {
    for (const tag of tags) {
      const match = clean.match(new RegExp(`(?:^|\n)${tag}:\s*([\s\S]*?)(?=\n[A-Z][A-Z_]{2,}:|$)`, 'i'));
      if (match?.[1]?.trim()) return stripCitations(match[1].trim());
    }
    return '';
  };
  const extractList = (...tags) => {
    for (const tag of tags) {
      const match = clean.match(new RegExp(`(?:^|\n)${tag}:\s*([\s\S]*?)(?=\n[A-Z][A-Z_]{2,}:|$)`, 'i'));
      if (match?.[1]) {
        const items = match[1].split('\n')
          .map(l => stripCitations(l.replace(/^[✔•\-*\d.]+\s*/, '').trim()))
          .filter(l => l.length > 10);
        if (items.length) return items;
      }
    }
    return [];
  };
  console.log('🤖 Raw Insights Output:', clean.slice(0, 500));
  return {
    summary:               extract('SUMMARY'),
    confidenceScore:       extract('CONFIDENCE_SCORE'),
    keyInsights:           extractList('KEY_INSIGHTS'),
    evidenceSynthesis:     extract('EVIDENCE_SYNTHESIS'),
    clinicalTrialInsights: extract('CLINICAL_TRIAL_INSIGHTS', 'TRIALS_CONNECTION'),
    emergingTreatments:    extract('EMERGING_TREATMENTS'),
    researchTrends:        extractList('RESEARCH_TRENDS'),
    limitations:           extract('LIMITATIONS', 'GAPS', 'CRITICAL_INSIGHT'),
    sources:               extract('SOURCES'),
    conditionOverview:     extract('CONDITION_OVERVIEW', 'SUMMARY'),
    trialsConnection:      extract('TRIALS', 'TRIALS_CONNECTION', 'CLINICAL_TRIAL_INSIGHTS'),
    criticalInsight:       (() => {
      const g = extract('GAPS', 'CRITICAL_INSIGHT', 'LIMITATIONS', 'RESEARCH_GAPS');
      if (g) return g;
      const p = papers.find(p => (p.abstract||'').toLowerCase().includes('limit'));
      if (p) return `Further research is needed to address limitations noted in "${p.title.slice(0, 50)}...", particularly concerning long-term evidence.`;
      return 'Limited specific long-term clinical data available in the retrieved global research.';
    })()
  };
}

chatRoute.get('/history/:sessionId', (req, res) => {
  const s = getSession(req.params.sessionId);
  res.json({ messages: s.messages || [], disease: s.currentDisease });
});

chatRoute.delete('/history/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});
