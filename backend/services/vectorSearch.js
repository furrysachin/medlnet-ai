// ── Vector Search Service (FAISS-style in-memory + Hybrid) ───────
// Uses @xenova/transformers for local embeddings (no API key needed)

let pipeline = null;

async function getEmbedder() {
  if (!pipeline) {
    try {
      const { pipeline: createPipeline } = await import('@xenova/transformers');
      pipeline = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('✅ Embedder loaded: all-MiniLM-L6-v2');
    } catch (err) {
      console.warn('⚠️  Embedder unavailable:', err.message);
      pipeline = null;
    }
  }
  return pipeline;
}

// ── Cosine Similarity ─────────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

// ── Get Embedding ─────────────────────────────────────────────────
async function embed(text) {
  const embedder = await getEmbedder();
  if (!embedder) return null;
  const output = await embedder(text.slice(0, 512), { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// ── Semantic Score ────────────────────────────────────────────────
async function semanticScore(queryVec, text) {
  if (!queryVec) return 0;
  const docVec = await embed(text);
  if (!docVec) return 0;
  return cosineSim(queryVec, docVec);
}

// ── Keyword Score (BM25-lite) ─────────────────────────────────────
function keywordScore(text, queryTerms) {
  const t = text.toLowerCase();
  let score = 0;
  queryTerms.forEach(term => {
    const count = (t.match(new RegExp(term, 'g')) || []).length;
    score += count > 0 ? 1 + Math.log(count) : 0;
  });
  return score;
}

// ── Hybrid Rerank (Semantic + Keyword + Medical Signals) ──────────
export async function hybridRerank(papers, query, disease, topN = 8) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  // Try semantic embedding
  let queryVec = null;
  try {
    queryVec = await embed(`${disease} ${query}`);
  } catch {
    queryVec = null;
  }

  const scored = await Promise.all(papers.map(async p => {
    const text = `${p.title} ${p.abstract}`.slice(0, 600);

    // Keyword score (always available)
    const kw = keywordScore(text, queryTerms);

    // Semantic score (if embedder available)
    const sem = queryVec ? await semanticScore(queryVec, text) : 0;

    // Medical signal boosts
    const t = text.toLowerCase();
    let medical = 0;
    if (/randomized|rct/.test(t))              medical += 0.3;
    if (/meta-analysis|systematic review/.test(t)) medical += 0.25;
    if (/clinical trial/.test(t))              medical += 0.2;
    if (parseInt(p.year) >= 2022)              medical += 0.15;
    if (p.source === 'PubMed')                 medical += 0.1;
    if (/animal|in vitro|mouse/.test(t))       medical -= 0.2;

    // Recency score (0–1 normalized)
    const year = parseInt(p.year) || 2000;
    const recency = year >= 2024 ? 1.0 : year >= 2022 ? 0.75 : year >= 2020 ? 0.5 : year >= 2018 ? 0.25 : 0.1;

    // Source credibility score (0–1)
    const sourceMap = { 'PubMed': 1.0, 'Semantic Scholar': 0.85, 'OpenAlex': 0.7 };
    const sourceVal = sourceMap[p.source] || 0.5;

    // Hybrid score: 50% semantic + 30% recency + 20% source
    const hybrid = (sem * 0.5) + (recency * 0.3) + (sourceVal * 0.2);

    return { ...p, _hybridScore: hybrid, _semScore: sem, _kwScore: kw };
  }));

  // Deduplicate + sort
  const seen = new Set();
  return scored
    .filter(p => {
      const key = (p.title||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b._hybridScore - a._hybridScore)
    .slice(0, topN);
}

// ── In-memory Vector Store (FAISS-style) ─────────────────────────
class VectorStore {
  constructor() {
    this.docs = [];   // { id, text, vector, metadata }
  }

  async add(id, text, metadata = {}) {
    const vector = await embed(text);
    if (vector) this.docs.push({ id, text, vector, metadata });
  }

  async search(query, topN = 5) {
    const queryVec = await embed(query);
    if (!queryVec || !this.docs.length) return [];
    return this.docs
      .map(d => ({ ...d.metadata, _score: cosineSim(queryVec, d.vector) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, topN);
  }

  size() { return this.docs.length; }
  clear() { this.docs = []; }
}

// Session-scoped vector stores
const stores = new Map();

export function getVectorStore(sessionId) {
  if (!stores.has(sessionId)) stores.set(sessionId, new VectorStore());
  return stores.get(sessionId);
}

export async function indexPapers(sessionId, papers) {
  const store = getVectorStore(sessionId);
  store.clear();
  await Promise.all(
    papers.slice(0, 20).map(p =>
      store.add(p.pmid || p.url, `${p.title} ${p.abstract}`.slice(0, 512), p)
    )
  );
  return store.size();
}
