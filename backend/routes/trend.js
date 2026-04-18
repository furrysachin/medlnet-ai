import express from 'express';
import { fetchPubMedPapers } from '../services/pubmed.js';
import { fetchOpenAlexPapers } from '../services/openalex.js';
import { fetchClinicalTrials } from '../services/clinicaltrials.js';
import { fetchSemanticScholarTrending } from '../services/semanticScholar.js';
import { rankMedicalPapers, selectTopTrials, detectResearchTrends } from '../services/medicalRanker.js';
import { generateWithOllama, buildTrendPrompt } from '../services/llm.js';
import { deduplicate } from '../services/pipeline.js';

export const trendRoute = express.Router();

// ── Expanded Disease Trend Query Map ─────────────────────────────────
const TREND_QUERIES = {
  'lung cancer':    'pembrolizumab osimertinib EGFR KRAS immunotherapy clinical trial 2023 2024 2025',
  'breast cancer':  'HER2 CDK4/6 PARP inhibitor trastuzumab immunotherapy 2023 2024 2025',
  'brain cancer':   'glioblastoma temozolomide immunotherapy blood-brain barrier 2023 2024 2025',
  'brain damage':   'neuroprotection neuroplasticity stem cell TBI rehabilitation 2023 2024 2025',
  'parkinson':      'alpha-synuclein dopamine levodopa deep brain stimulation gene therapy 2023 2024 2025',
  'alzheimer':      'lecanemab donanemab amyloid tau neuroinflammation biomarker 2023 2024 2025',
  'diabetes':       'semaglutide GLP-1 SGLT2 tirzepatide beta cell regeneration 2023 2024 2025',
  'cancer':         'immunotherapy CAR-T PD-1 PD-L1 mRNA targeted therapy biomarker 2023 2024 2025',
  'hypertension':   'renal denervation combination therapy RAAS AI prediction 2023 2024 2025',
  'covid':          'long COVID mRNA antiviral immune modulation 2023 2024 2025',
  'tuberculosis':   'bedaquiline pretomanid drug resistant MDR-TB 2023 2024 2025',
  'heart disease':  'sacubitril SGLT2 cardiac biomarker heart failure 2023 2024 2025',
  'stroke':         'thrombectomy neuroprotection rehabilitation biomarker 2023 2024 2025',
  'depression':     'ketamine psilocybin TMS neuroplasticity serotonin 2023 2024 2025',
  'schizophrenia':  'dopamine glutamate antipsychotic clozapine biomarker 2023 2024 2025',
  'multiple sclerosis': 'ocrelizumab natalizumab remyelination neuroprotection 2023 2024 2025',
  'hiv':            'broadly neutralizing antibody long-acting ART cure strategy 2023 2024 2025',
  'obesity':        'semaglutide tirzepatide GLP-1 bariatric adipose tissue 2023 2024 2025',
  'asthma':         'biologic dupilumab mepolizumab IL-5 IL-13 2023 2024 2025',
  'arthritis':      'JAK inhibitor biologic TNF IL-6 rheumatoid 2023 2024 2025',
};

function getTrendQuery(disease) {
  const d = disease.toLowerCase().trim();
  for (const [key, q] of Object.entries(TREND_QUERIES)) {
    if (d.includes(key) || key.includes(d)) return `${disease} ${q}`;
  }
  // Smart generic fallback using disease name
  return `${disease} emerging therapy novel treatment clinical trial biomarker 2023 2024 2025`;
}

// ── Judge Questions Generator ─────────────────────────────────────────────
function generateJudgeQuestions(disease, trends = [], papers = [], trials = []) {
  const d = disease.toLowerCase();
  const drugs = [...new Set(
    papers.flatMap(p => `${p.title} ${p.abstract||''}`.toLowerCase()
      .match(/\b(pembrolizumab|osimertinib|semaglutide|lecanemab|tirzepatide|cemiplimab|nivolumab|trastuzumab|bedaquiline|levodopa|donepezil)\b/g) || [])
  )].slice(0, 3);

  const trialPhases = [...new Set(trials.map(t => t.phase).filter(Boolean))].slice(0, 2);
  const trendNames  = trends.map(t => t.name || t.trend || '').filter(Boolean).slice(0, 3);

  const questions = [
    // Evidence-based
    `What is the current first-line treatment for ${disease} based on Phase 3 clinical trial evidence?`,
    `How does ${drugs[0] || 'the leading drug'} compare to standard of care in ${disease} patients?`,
    // Mechanism
    `What molecular mechanisms are being targeted in the latest ${disease} research?`,
    `How do biomarkers influence treatment selection in ${disease}?`,
    // Trials
    trials.length > 0
      ? `What are the key outcomes from ${trialPhases[0] || 'Phase 3'} trials in ${disease} listed in your dataset?`
      : `What clinical trials are currently recruiting for ${disease} treatment?`,
    // Trends
    trendNames[0]
      ? `Explain the significance of "${trendNames[0]}" as an emerging trend in ${disease} research.`
      : `What are the most promising emerging therapies for ${disease}?`,
    // Gaps
    `What are the major research gaps in ${disease} treatment that remain unaddressed?`,
    // India-specific
    `What India-specific clinical evidence exists for ${disease} treatment protocols?`,
    // Comparative
    drugs.length >= 2
      ? `Compare the efficacy of ${drugs[0]} vs ${drugs[1]} in ${disease} based on retrieved evidence.`
      : `How does immunotherapy compare to targeted therapy in ${disease}?`,
    // Future
    `What does the research suggest about the future of ${disease} treatment in the next 5 years?`,
  ];

  return questions.filter(Boolean).slice(0, 8);
}

// ── Robust Trend Parser ───────────────────────────────────────────────────
function parseTrends(raw) {
  if (!raw) return null;
  const clean = raw.replace(/#{1,6}\s*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();

  // Try structured TREND_N: format first
  const extractTrend = (n) => {
    const match = clean.match(new RegExp(`TREND_${n}:\\s*([\\s\\S]*?)(?=TREND_${n+1}:|FINAL_SUMMARY:|$)`));
    if (!match) return null;
    const lines = match[1].trim().split('\n').map(l => l.trim()).filter(Boolean);
    return {
      name:     lines[0] || `Trend ${n}`,
      evidence: lines.find(l => l.toLowerCase().startsWith('evidence:'))?.replace(/^evidence:\s*/i, '') || lines[1] || '',
      why:      lines.find(l => l.toLowerCase().startsWith('why'))?.replace(/^why[^:]*:\s*/i, '') || lines[2] || ''
    };
  };

  const structured = [1, 2, 3, 4, 5].map(extractTrend).filter(Boolean);

  // Fallback: parse bullet/numbered list if LLM ignored format
  const fallbackTrends = structured.length === 0
    ? clean.split('\n')
        .filter(l => /^[-•*\d.]/.test(l.trim()) && l.trim().length > 20)
        .slice(0, 5)
        .map((l, i) => ({
          name:     l.replace(/^[-•*\d.]+\s*/, '').slice(0, 120),
          evidence: '',
          why:      ''
        }))
    : [];

  const trends = structured.length > 0 ? structured : fallbackTrends;

  const summaryMatch = clean.match(/FINAL_SUMMARY:\s*([\s\S]*?)$/);
  const summary = summaryMatch
    ? summaryMatch[1].trim()
    : clean.split('\n').filter(l => l.length > 40).slice(-2).join(' ');

  return { trends, summary };
}

// ── Main Trend Route ──────────────────────────────────────────────────────
trendRoute.post('/trends', async (req, res) => {
  try {
    const { disease, query: userQuery = '' } = req.body;
    if (!disease) return res.status(400).json({ error: 'disease is required' });

    const trendQuery = getTrendQuery(disease);

    // Fetch from 4 sources in parallel — PubMed + OpenAlex + ClinicalTrials + Semantic Scholar
    const [pubmed, openalex, trials, semanticPapers] = await Promise.all([
      fetchPubMedPapers(trendQuery, 50),
      fetchOpenAlexPapers(trendQuery, 50),
      fetchClinicalTrials(disease, 'treatment therapy clinical trial', 50),
      fetchSemanticScholarTrending(disease, userQuery || trendQuery, 25),
    ]);

    const allPapers = deduplicate([...pubmed, ...openalex, ...semanticPapers]);
    const topPapers = rankMedicalPapers(allPapers, disease, trendQuery, 12);

    // Semantic Scholar highly-cited papers as dedicated trend signals
    const highlyCited = semanticPapers
      .filter(p => p.isHighlyCited)
      .slice(0, 5)
      .map(p => ({
        name: p.title.slice(0, 80),
        evidence: `${p.citationCount} citations (Semantic Scholar)`,
        why: `Highly cited ${p.year} paper — influential in ${disease} research`,
        source: 'Semantic Scholar',
        url: p.url,
        year: p.year,
        citationCount: p.citationCount,
      }));

    // Always get trials — fallback to raw if ranker returns 0
    let topTrials = selectTopTrials(trials, disease, 8);
    if (topTrials.length === 0 && trials.length > 0) topTrials = trials.slice(0, 6);

    const detectedTrends = detectResearchTrends(topPapers, topTrials, userQuery);

    const raw = await generateWithOllama(buildTrendPrompt(disease, topPapers, topTrials));
    const parsed = parseTrends(raw);

    // Merge LLM trends + highly-cited Semantic Scholar papers
    const llmTrends = parsed?.trends?.length
      ? parsed.trends
      : detectedTrends.slice(0, 5).map(t => ({
          name: t.trend.charAt(0).toUpperCase() + t.trend.slice(1),
          evidence: `Detected ${t.score} times in retrieved ${disease} literature`,
          why: 'Recurring signal across PubMed, OpenAlex, and Semantic Scholar',
        }));

    const allTrends = [
      ...llmTrends,
      ...highlyCited.filter(h => !llmTrends.some(l => l.name.toLowerCase().includes(h.name.slice(0,20).toLowerCase())))
    ].slice(0, 7);

    const judgeQuestions = generateJudgeQuestions(disease, allTrends, topPapers, topTrials);

    res.json({
      disease,
      trends:         allTrends,
      summary:        parsed?.summary || `Emerging research in ${disease} focuses on novel therapeutics and biomarker-driven treatment strategies.`,
      detectedTrends,
      highlyCited,
      judgeQuestions,
      papers:         topPapers,
      trials:         topTrials,
      meta: {
        papersAnalyzed: allPapers.length,
        papersUsed:     topPapers.length,
        trialsFound:    trials.length,
        trialsUsed:     topTrials.length,
        semanticPapers: semanticPapers.length,
        sources:        ['PubMed', 'OpenAlex', 'ClinicalTrials.gov', 'Semantic Scholar'],
        trendQuery
      }
    });

  } catch (err) {
    console.error('Trend error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

