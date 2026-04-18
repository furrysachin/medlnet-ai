import express from 'express';
import axios from 'axios';
import { fetchPubMedPapers } from '../services/pubmed.js';
import { fetchOpenAlexPapers } from '../services/openalex.js';
import { fetchClinicalTrials } from '../services/clinicaltrials.js';
import { rankMedicalPapers, selectTopTrials } from '../services/medicalRanker.js';
import { doctorAgent } from '../agents/doctorAgent.js';
import { safetyAgent } from '../agents/safetyAgent.js';
import { calculateConfidence } from '../utils/confidence.js';
import { getEmbedding } from '../services/embedder.js';
import { addToVectorStore } from '../services/vectorStore.js';
import { HfInference } from '@huggingface/inference';

export const streamRoute = express.Router();

const hf = new HfInference(process.env.HF_API_KEY);
const MODEL = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";

function send(res, type, data) {
  res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
}

streamRoute.post('/stream', async (req, res) => {
  const { disease, query, location = '' } = req.body;
  if (!disease || !query) return res.status(400).json({ error: 'disease and query required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Status updates
    send(res, 'status', { msg: '🔍 Analyzing query intent...' });
    await sleep(300);

    send(res, 'status', { msg: '📚 Fetching PubMed research papers...' });
    const [pubmed, openalex, trials] = await Promise.all([
      fetchPubMedPapers(`${disease} ${query}`, 80),
      fetchOpenAlexPapers(`${disease} ${query}`, 80),
      fetchClinicalTrials(disease, query, 30)
    ]);

    send(res, 'status', { msg: '🌐 Searching OpenAlex database...' });
    await sleep(200);

    send(res, 'status', { msg: '🧪 Scanning ClinicalTrials.gov...' });
    await sleep(200);

    send(res, 'status', { msg: '🧠 Ranking evidence by clinical strength...' });
    const papers = rankMedicalPapers([...pubmed, ...openalex], disease, query, 6);
    const topTrials = selectTopTrials(trials, disease, 4);

    // Vector memory
    const embedding = await getEmbedding(`${disease} ${query}`);
    if (embedding) {
      papers.forEach(p => addToVectorStore({
        text: `${p.title} ${(p.abstract || '').slice(0, 200)}`,
        vector: embedding,
        data: { title: p.title, year: p.year, source: p.source }
      }));
    }

    const confidence = calculateConfidence({ papers, trials: topTrials, vectorHits: 0 });

    // Send metadata before streaming text
    send(res, 'meta', {
      papers: papers.length,
      trials: topTrials.length,
      confidence: confidence.score,
      confidenceLabel: confidence.label,
      confidenceReason: confidence.reason
    });

    send(res, 'status', { msg: '🤖 Generating clinical analysis...' });

    // Stream LLM response via Hugging Face
    const prompt = doctorAgent({ query, disease, papers, trials: topTrials });
    let fullText = '';

    const stream = hf.chatCompletionStream({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullText += delta;
        send(res, 'delta', { text: delta });
      }
    }

    const safety = safetyAgent(fullText, papers);
    send(res, 'done', {
      safety: safety.safe,
      flags: safety.flags,
      papers,
      trials: topTrials,
      confidence
    });
    res.end();

  } catch (err) {
    send(res, 'error', { msg: err.message });
    send(res, 'done', {});
    res.end();
  }
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
