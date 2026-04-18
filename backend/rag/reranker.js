export function rerank(query, docs) {
  const q = query.toLowerCase();
  const qWords = q.split(/\s+/).filter(w => w.length > 2);

  return docs
    .map(d => {
      const text = `${d.title || ''} ${d.abstract || d.description || ''}`.toLowerCase();
      let score = d.score || 0;

      // Semantic overlap
      qWords.forEach(w => { if (text.includes(w)) score += 2; });

      // Clinical signal boost
      if (/treatment|therapy|clinical/.test(text)) score += 2;
      if (/phase\s*(3|iii)/.test(text)) score += 3;
      if (/randomized/.test(text)) score += 2;
      if (/immunotherapy|car.t|mrna/.test(text)) score += 3;

      // Recency
      const year = parseInt(d.year) || 0;
      if (year >= 2023) score += 2;

      return { ...d, score };
    })
    .sort((a, b) => b.score - a.score);
}
