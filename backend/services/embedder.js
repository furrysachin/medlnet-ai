import axios from 'axios';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export async function getEmbedding(text) {
  try {
    const res = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
      model: 'nomic-embed-text',
      prompt: String(text).slice(0, 512)
    }, { timeout: 10000 });
    return res.data?.embedding || null;
  } catch {
    // Fallback: simple TF-IDF-like sparse vector
    return simpleFallbackVector(text);
  }
}

// Fallback when nomic-embed-text not installed
function simpleFallbackVector(text) {
  const keywords = [
    'cancer', 'tumor', 'immunotherapy', 'car-t', 'mrna', 'targeted',
    'diabetes', 'insulin', 'metformin', 'alzheimer', 'clinical trial',
    'phase 3', 'randomized', 'biomarker', 'treatment', 'therapy',
    'drug', 'efficacy', 'survival', 'mutation', 'gene'
  ];
  const t = text.toLowerCase();
  return keywords.map(k => t.includes(k) ? 1 : 0);
}
