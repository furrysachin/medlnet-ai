import axios from 'axios';

const OPENALEX_BASE = 'https://api.openalex.org/works';

// ─────────────────────────────────────────────
// 🌍 COUNTRY MAPPING LAYER
// ─────────────────────────────────────────────
const COUNTRY_MAP = {
  IN: '🇮🇳 India', US: '🇺🇸 USA', GB: '🇬🇧 UK', CN: '🇨🇳 China',
  DE: '🇩🇪 Germany', JP: '🇯🇵 Japan', AU: '🇦🇺 Australia',
  CA: '🇨🇦 Canada', FR: '🇫🇷 France', IT: '🇮🇹 Italy',
  BR: '🇧🇷 Brazil', KR: '🇰🇷 South Korea'
};

const getCountry = (code) => COUNTRY_MAP[code] || code;

// ─────────────────────────────────────────────
// 🧠 ABSTRACT RECONSTRUCTION
// ─────────────────────────────────────────────
function buildAbstract(invertedIndex) {
  try {
    const arr = [];
    for (const [word, positions] of Object.entries(invertedIndex || {})) {
      positions.forEach(p => (arr[p] = word));
    }
    return arr.filter(Boolean).join(' ');
  } catch {
    return 'Abstract not available';
  }
}

// ─────────────────────────────────────────────
// 🌐 FETCH LAYER (GLOBAL + INDIA BALANCED)
// ─────────────────────────────────────────────
export async function fetchOpenAlexPapers(query, maxResults = 100) {
  try {
    const limit = Math.min(maxResults, 200);

    const [globalRes, indiaRes] = await Promise.all([
      axios.get(OPENALEX_BASE, {
        params: {
          search: query,
          'per-page': Math.floor(limit * 0.6),
          page: 1,
          sort: 'relevance_score:desc',
          filter: 'from_publication_date:2018-01-01'
        },
        timeout: 15000
      }),

      axios.get(OPENALEX_BASE, {
        params: {
          search: `${query} India`,
          'per-page': Math.floor(limit * 0.4),
          page: 1,
          sort: 'relevance_score:desc',
          filter: 'from_publication_date:2018-01-01,institutions.country_code:IN'
        },
        timeout: 15000
      })
    ]);

    const global = globalRes.data?.results || [];
    const india = indiaRes.data?.results || [];

    const merged = [...india, ...global];

    return merged.map(work => {
      const authors = (work.authorships || [])
        .slice(0, 3)
        .map(a => a.author?.display_name)
        .filter(Boolean)
        .join(', ') || 'N/A';

      const firstInst = work.authorships?.[0]?.institutions?.[0];
      const country = firstInst?.country_code ? getCountry(firstInst.country_code) : null;

      const abstract = work.abstract_inverted_index
        ? buildAbstract(work.abstract_inverted_index)
        : 'No abstract available';

      return {
        title: work.display_name || 'N/A',
        abstract: abstract.slice(0, 500),
        authors,
        year: work.publication_year || 'N/A',
        journal: work.primary_location?.source?.display_name || 'N/A',
        source: 'OpenAlex',

        country,
        url: work.doi
          ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}`
          : work.id,

        citationCount: work.cited_by_count || 0,
        relevanceScore: work.relevance_score || 0
      };
    }).filter(p => p.title !== 'N/A');

  } catch (err) {
    console.error('OpenAlex error:', err.message);
    return [];
  }
}