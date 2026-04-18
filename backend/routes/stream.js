import express from 'express';
import { HfInference } from '@huggingface/inference';
import { fetchPubMedPapers } from '../services/pubmed.js';
import { fetchOpenAlexPapers } from '../services/openalex.js';
import { fetchClinicalTrials } from '../services/clinicaltrials.js';
import { rankMedicalPapers, selectTopTrials } from '../services/medicalRanker.js';
import { doctorAgent } from '../agents/doctorAgent.js';
import { calculateConfidence } from '../utils/confidence.js';

export const streamRoute = express.Router();
const hf = new HfInference(process.env.HF_API_KEY);
const MODEL = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";

function send(res, type, data) {
  res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
}

streamRoute.post('/stream', async (req, res) => {
  const { disease, query } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    send(res, 'status', { msg: '🔍 Searching medical databases...' });
    const [pubmed, openalex, trials] = await Promise.all([
      fetchPubMedPapers(`${disease} ${query}`, 60),
      fetchOpenAlexPapers(`${disease} ${query}`, 60),
      fetchClinicalTrials(disease, query, 30)
    ]);

    const papers = rankMedicalPapers([...pubmed, ...openalex], disease, query, 6);
    const topTrials = selectTopTrials(trials, disease, 4);
    const confidence = calculateConfidence({ papers, trials: topTrials, vectorHits: 0 });

    send(res, 'meta', { papers: papers.length, trials: topTrials.length, confidence: confidence.score });
    send(res, 'status', { msg: '🤖 Synthesizing answer...' });

    const prompt = doctorAgent({ query, disease, papers, trials: topTrials });
    const stream = hf.chatCompletionStream({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) send(res, 'delta', { text: delta });
    }

    send(res, 'done', { papers, trials: topTrials, confidence });
    res.end();
  } catch (err) {
    send(res, 'error', { msg: err.message });
    res.end();
  }
});

export default streamRoute;
