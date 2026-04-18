import axios from 'axios';

const BASE = 'https://api.semanticscholar.org/graph/v1';
const FIELDS = 'paperId,title,abstract,year,citationCount,influentialCitationCount,publicationTypes,authors,externalIds,openAccessPdf';

const http = axios.create({ baseURL: BASE, timeout: 15000 });

// Safe fetch with retry on 429
async function safeFetch(url, params, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await http.get(url, { params });
      return res.data;
    } catch (err) {
      if (err.response?.status === 429 && i < retries) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      } else throw err;
    }
  }
}

// Normalize to common paper shape
function normalize(p) {
  return {
    title:          p.title || '',
    abstract:       p.abstract || 'No abstract available',
    year:           String(p.year || ''),
    authors:        (p.authors || []).map(a => a.name).join(', ') || 'N/A',
    citationCount:  p.citationCount || 0,
    influentialCitations: p.influentialCitationCount || 0,
    source:         'Semantic Scholar',
    url:            p.externalIds?.DOI
                      ? `https://doi.org/${p.externalIds.DOI}`
                      : `https://www.semanticscholar.org/paper/${p.paperId}`,
    pdfUrl:         p.openAccessPdf?.url || null,
    isHighlyCited:  (p.influentialCitationCount || 0) >= 10,
    publicationType:(p.publicationTypes || []).join(', '),
  };
}

// Search papers by query — sorted by citation count (trending)
export async function fetchSemanticScholarPapers(query, limit = 30) {
  try {
    const data = await safeFetch('/paper/search', {
      query,
      limit,
      fields: FIELDS,
      sort: 'citationCount',   // most cited = trending
    });
    return (data?.data || []).map(normalize).filter(p => p.title);
  } catch (err) {
    console.warn('Semantic Scholar fetch failed:', err.message);
    return [];
  }
}

// Get recommended/related papers for a topic — uses bulk search with year filter
export async function fetchSemanticScholarTrending(disease, query, limit = 20) {
  try {
    // Two parallel searches: recent (2023+) highly cited + query-specific
    const [recent, specific] = await Promise.all([
      safeFetch('/paper/search', {
        query: `${disease} treatment therapy 2024`,
        limit,
        fields: FIELDS,
        sort: 'citationCount',
      }),
      safeFetch('/paper/search', {
        query: `${disease} ${query}`,
        limit,
        fields: FIELDS,
        sort: 'citationCount',
      }),
    ]);

    const all = [...(recent?.data || []), ...(specific?.data || [])];
    // Deduplicate by paperId
    const seen = new Set();
    return all
      .filter(p => { if (seen.has(p.paperId)) return false; seen.add(p.paperId); return true; })
      .map(normalize)
      .filter(p => p.title && parseInt(p.year) >= 2020)
      .sort((a, b) => b.citationCount - a.citationCount)
      .slice(0, limit);
  } catch (err) {
    console.warn('Semantic Scholar trending fetch failed:', err.message);
    return [];
  }
}
