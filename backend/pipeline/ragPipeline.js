import { getEmbedding } from '../services/embedder.js';
import { addToVectorStore } from '../services/vectorStore.js';
import { retrieve } from '../rag/retriever.js';
import { rerank } from '../rag/reranker.js';
import { doctorAgent } from '../agents/doctorAgent.js';
import { safetyAgent } from '../agents/safetyAgent.js';
import { calculateConfidence } from '../utils/confidence.js';
import { generateWithOllama } from '../services/llm.js';

export async function ragPipeline({ disease, query, papers = [], trials = [] }) {
  // 1. Embedding
  const embedding = await getEmbedding(`${disease} ${query}`);

  // 2. Hybrid retrieval
  const { vectorHits, merged } = await retrieve(query, embedding, papers);

  // 3. Rerank
  const reranked = rerank(query, merged.length > 0 ? merged : papers);

  // 4. Top context
  const topPapers = reranked.slice(0, 6);
  const topTrials = trials.slice(0, 4);

  // 5. Store in vector memory
  if (embedding) {
    topPapers.forEach(p => addToVectorStore({
      text: `${p.title} ${(p.abstract || '').slice(0, 200)}`,
      vector: embedding,
      data: { title: p.title, year: p.year, source: p.source }
    }));
  }

  // 6. Doctor agent prompt
  const prompt = doctorAgent({ query, disease, papers: topPapers, trials: topTrials });
  const answer = await generateWithOllama(prompt);

  // 7. Safety check
  const safety = safetyAgent(answer, topPapers);

  // 8. Confidence score
  const confidence = calculateConfidence({
    papers: topPapers,
    trials: topTrials,
    vectorHits: vectorHits.length
  });

  return { answer, confidence, safety, papers: topPapers, trials: topTrials };
}
