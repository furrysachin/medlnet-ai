// ─────────────────────────────────────────────
// 🧠 IN-MEMORY VECTOR STORE (Hackathon RAG)
// ─────────────────────────────────────────────

const store = [];

export function addToVectorStore(doc) {
  store.push(doc);
  // Keep store bounded
  if (store.length > 500) store.shift();
}

export function searchVectorStore(queryVector, topK = 5) {
  if (!store.length || !queryVector?.length) return [];
  return store
    .map(doc => ({ ...doc, score: cosineSimilarity(queryVector, doc.vector) }))
    .filter(d => d.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function clearVectorStore() {
  store.length = 0;
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
