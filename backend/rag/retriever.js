import { searchVectorStore } from '../services/vectorStore.js';

export async function retrieve(query, embedding, docs = []) {
  // Vector search from memory
  const vectorHits = embedding ? searchVectorStore(embedding, 5) : [];

  // BM25-style keyword scoring on live docs
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const keywordHits = docs
    .map(d => ({
      ...d,
      _kwScore: keywordScore(queryWords, `${d.title} ${d.abstract || ''}`)
    }))
    .filter(d => d._kwScore > 0)
    .sort((a, b) => b._kwScore - a._kwScore)
    .slice(0, 8);

  // Merge — deduplicate by title
  const seen = new Set();
  const merged = [...keywordHits, ...vectorHits.map(h => h.data)].filter(d => {
    if (!d?.title) return false;
    const key = d.title.slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { vectorHits, keywordHits, merged };
}

function keywordScore(queryWords, text) {
  const t = text.toLowerCase();
  let score = 0;
  queryWords.forEach(w => { if (t.includes(w)) score++; });
  return score;
}
