import express from 'express';

import { fetchPubMedPapers } from '../services/pubmed.js';
import { fetchOpenAlexPapers } from '../services/openalex.js';
import { fetchClinicalTrials } from '../services/clinicaltrials.js';

import {
  generateWithOllama,
  checkOllamaHealth,
  buildLLMPrompt,
  buildInsightsPrompt,
  computeConfidenceScore
} from '../services/llm.js';

import {
  parseInput,
  detectIntent,
  buildQuery,
  buildContext
} from '../services/pipeline.js';

import { rankMedicalPapers, selectTopTrials } from '../services/medicalRanker.js';
import { getEmbedding } from '../services/embedder.js';
import { addToVectorStore, searchVectorStore } from '../services/vectorStore.js';

export const askRoute = express.Router();


// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
askRoute.get('/health/llm', async (_, res) => {
  const status = await checkOllamaHealth();
  res.json(status);
});


// ─────────────────────────────────────────────
// MAIN PIPELINE (RESEARCH + REASONING ENGINE)
// ─────────────────────────────────────────────
askRoute.post('/ask', async (req, res) => {
  try {

    // 1. Parse user input
    const { disease, query, name, location, history } = parseInput(req.body);

    if (!disease || !query) {
      return res.status(400).json({
        error: "disease and query are required"
      });
    }

    // 2. Intent + embedding + vector search
    const intent = detectIntent(query);
    const mergedQuery = buildContext(history, query, disease);
    const expandedQueryObj = buildQuery(disease, mergedQuery, intent);
    const expandedQuery = expandedQueryObj.openalex || `${disease} ${query}`;

    // Vector search for semantic memory hits
    const queryVector = await getEmbedding(`${disease} ${query}`);
    const semanticHits = queryVector ? searchVectorStore(queryVector, 3) : [];

    // ─────────────────────────────────────────────
    // 3. PARALLEL RETRIEVAL (PubMed + OpenAlex + Trials)
    // ─────────────────────────────────────────────
    const [pubmedPapers, openAlexPapers, trialsRaw] = await Promise.all([
      fetchPubMedPapers(expandedQueryObj.pubmed || expandedQuery, 120),
      fetchOpenAlexPapers(expandedQuery, 120),
      fetchClinicalTrials(disease, query, 50)
    ]);

    // ─────────────────────────────────────────────
    // 4. FUSE + RANK (MEDICAL-GRADE ENGINE)
    // ─────────────────────────────────────────────
    const fusedPapers = [
      ...pubmedPapers.map(p => ({ ...p, source: "PubMed" })),
      ...openAlexPapers.map(p => ({ ...p, source: "OpenAlex" }))
    ];

    const finalPapers = rankMedicalPapers(fusedPapers, disease, query, 8);
    const finalTrials = selectTopTrials(trialsRaw, disease, 6);

    // Store top papers in vector memory for future queries
    if (queryVector) {
      finalPapers.forEach(p => addToVectorStore({
        text: `${p.title} ${(p.abstract || '').slice(0, 200)}`,
        vector: queryVector,
        data: { title: p.title, year: p.year, source: p.source }
      }));
    }

    // ─────────────────────────────────────────────
    // 5. ZERO RESULT HANDLING
    // ─────────────────────────────────────────────
    if (!finalPapers.length && !finalTrials.length) {
      return res.json({
        response: `No strong clinical evidence found for "${query}" in ${disease}. Try refining your question.`,
        papers: [],
        trials: [],
        insights: null,
        meta: {
          intent,
          disease,
          retrieved: fusedPapers.length
        }
      });
    }

    // ─────────────────────────────────────────────
    // 6. MINIMUM EVIDENCE CHECK (ANTI-NOISE GATE)
    // ─────────────────────────────────────────────
    if (finalPapers.length < 3 && finalTrials.length === 0) {
      return res.json({
        response: `Insufficient validated research evidence for "${query}" in ${disease}.`,
        papers: finalPapers,
        trials: finalTrials,
        insights: null,
        meta: {
          intent,
          disease,
          retrieved: fusedPapers.length
        }
      });
    }

    // ─────────────────────────────────────────────
    // 7. LLM REASONING LAYER (OLLAMA / OPEN SOURCE)
    // ─────────────────────────────────────────────
    const [response, insightsRaw] = await Promise.all([
      generateWithOllama(
        buildLLMPrompt({
          name,
          disease,
          query,
          location,
          papers: finalPapers,
          trials: finalTrials,
          history
        })
      ),
      generateWithOllama(
        buildInsightsPrompt({
          disease,
          query,
          papers: finalPapers,
          trials: finalTrials,
          intent
        })
      )
    ]);

    const insights = parseInsights(insightsRaw);

    const confidence = computeConfidenceScore(finalPapers, finalTrials);

    res.json({
      response: stripCitations(response),
      insights,
      insights,
      papers: finalPapers,
      trials: finalTrials,
      expandedQuery,
      confidence,
      semanticMemoryHits: semanticHits.length,
      meta: {
        intent,
        disease,
        retrievedPapers: fusedPapers.length,
        finalPapers: finalPapers.length,
        finalTrials: finalTrials.length
      }
    });

  } catch (err) {
    console.error("Ask error:", err.message);

    res.status(500).json({
      error: err.message,
      response: "System error while processing medical query."
    });
  }
});


function stripCitations(text = '') {
  return text.replace(/\s*\[\d+\]/g, '').replace(/\s*\[T\d+\]/g, '').trim();
}

function parseInsights(raw) {
  if (!raw) return null;
  const clean = raw.replace(/#{1,6}\s*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
  const extract = tag => {
    const match = clean.match(new RegExp(`${tag}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`));
    return match ? stripCitations(match[1].trim()) : '';
  };
  const extractList = tag => {
    const match = clean.match(new RegExp(`${tag}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`));
    if (!match) return [];
    return match[1].split('\n').map(l => stripCitations(l.replace(/^[✔•\-*\d.]+\s*/, '').trim())).filter(l => l.length > 10);
  };
  return {
    keyInsights:       extractList('KEY_INSIGHTS'),
    conditionOverview: extract('CONDITION_OVERVIEW') || extract('SUMMARY'),
    evidenceSynthesis: extract('EVIDENCE_SYNTHESIS'),
    trialsConnection:  extract('TRIALS_CONNECTION') || extract('CLINICAL_TRIAL_INSIGHTS'),
    criticalInsight:   extract('CRITICAL_INSIGHT') || extract('LIMITATIONS')
  };
}