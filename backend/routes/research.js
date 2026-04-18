import express from 'express';

import { fetchPubMedPapers } from '../services/pubmed.js';
import { fetchOpenAlexPapers } from '../services/openalex.js';
import { fetchClinicalTrials } from '../services/clinicaltrials.js';

import {
  detectIntent,
  deduplicate,
  buildQuery
} from '../services/pipeline.js';

import { rankMedicalPapers, selectTopTrials } from '../services/medicalRanker.js';

import { checkOllamaHealth } from '../services/llm.js';

const router = express.Router();

/* ─────────────────────────────────────────────
   MAIN FETCH PIPELINE (RAG CORE)
──────────────────────────────────────────── */
router.post('/fetch', async (req, res) => {
  try {
    const { disease, query } = req.body;

    if (!disease || !query) {
      return res.status(400).json({
        error: 'disease and query required'
      });
    }

    /* ────────────────
       1. INTENT DETECT
    ──────────────── */
    const intent = detectIntent(query);
    const queryObj = buildQuery(disease, query, intent);
    const expandedQuery = queryObj.openalex || `${disease} ${query}`;

    /* ────────────────
       3. PARALLEL DATA FETCH (MULTI-SOURCE RAG)
    ──────────────── */
    const [pubmed, openalex, trials] = await Promise.all([
      fetchPubMedPapers(expandedQuery, 120),
      fetchOpenAlexPapers(expandedQuery, 120),
      fetchClinicalTrials(disease, query, 50)
    ]);

    /* ────────────────
       4. MERGE + DEDUPE (IMPORTANT)
    ──────────────── */
    const mergedPapers = deduplicate([
      ...pubmed,
      ...openalex
    ]);

    /* ────────────────
       5. TWO-STAGE RANKING
       (PubMed bias preserved)
    ──────────────── */
    const pubmedTop = rankMedicalPapers(pubmed, disease, query, 5);
    const openalexTop = rankMedicalPapers(openalex, disease, query, 5);

    const finalPapers = rankMedicalPapers(
      [...pubmedTop, ...openalexTop],
      disease,
      query,
      8
    );

    const finalTrials = selectTopTrials(trials, disease, 6);

    /* ────────────────
       6. ZERO RESULT HANDLING
    ──────────────── */
    if (!finalPapers.length && !finalTrials.length) {
      return res.json({
        message: `No strong research found for "${query}" in ${disease}`,
        papers: [],
        trials: [],
        meta: {
          pubmed: pubmed.length,
          openalex: openalex.length,
          trials: trials.length,
          finalPapers: 0,
          finalTrials: 0,
          intent,
          expandedQuery
        }
      });
    }

    /* ────────────────
       7. RESPONSE
    ──────────────── */
    return res.json({
      papers: finalPapers,
      trials: finalTrials,

      meta: {
        pubmed: pubmed.length,
        openalex: openalex.length,
        merged: mergedPapers.length,
        finalPapers: finalPapers.length,
        finalTrials: finalTrials.length,
        intent,
        expandedQuery
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Server error',
      details: err.message
    });
  }
});

/* ─────────────────────────────────────────────
   LLM STATUS CHECK
──────────────────────────────────────────── */
router.get('/llm-status', async (_, res) => {
  try {
    const status = await checkOllamaHealth();
    res.json(status);
  } catch (err) {
    res.status(500).json({
      available: false,
      error: err.message
    });
  }
});

export default router;