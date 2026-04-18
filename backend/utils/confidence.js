export function calculateConfidence({ papers = [], trials = [], vectorHits = 0 }) {
  let score = 50; // strong base
  const text = papers.map(p => `${p.title} ${p.abstract || ''}`).join(' ').toLowerCase();

  // Paper count (max 20)
  score += Math.min(papers.length * 4, 20);

  // Trial count (max 15)
  score += Math.min(trials.length * 5, 15);

  // Evidence quality bonuses
  if (/phase\s*(3|iii|4|iv)/.test(text)) score += 8;
  if (/phase\s*(2|ii)/.test(text)) score += 4;
  if (/randomized|rct/.test(text)) score += 6;
  if (/meta.analysis|systematic review/.test(text)) score += 6;
  if (/clinical trial/.test(text)) score += 5;
  if (/cohort|observational/.test(text)) score += 3;

  // Recency bonus
  if (/2024/.test(text)) score += 5;
  if (/2023/.test(text)) score += 4;
  if (/2022/.test(text)) score += 3;

  // Treatment intelligence bonus
  if (/immunotherapy|checkpoint/.test(text)) score += 4;
  if (/car.t|mrna|targeted therapy/.test(text)) score += 4;
  if (/biomarker|precision medicine/.test(text)) score += 3;

  // Source diversity
  const hasPubMed = papers.some(p => p.source === 'PubMed');
  const hasOpenAlex = papers.some(p => p.source === 'OpenAlex');
  if (hasPubMed && hasOpenAlex) score += 5;

  // Vector memory hits
  score += Math.min(vectorHits * 3, 6);

  // Citation strength
  const highCited = papers.filter(p => (p.citationCount || 0) > 50).length;
  score += Math.min(highCited * 3, 9);

  const final = Math.max(50, Math.min(score, 99));

  return {
    score: final,
    label: final >= 85 ? 'High' : final >= 65 ? 'Medium' : 'Low',
    reason: buildReason(papers, trials, text)
  };
}

function buildReason(papers, trials, text) {
  const parts = [];
  if (papers.length > 0) parts.push(`${papers.length} research papers`);
  if (trials.length > 0) parts.push(`${trials.length} clinical trials`);
  if (/phase\s*(3|iii)/.test(text)) parts.push('Phase 3 evidence');
  if (/meta.analysis/.test(text)) parts.push('meta-analysis');
  if (/2024|2023/.test(text)) parts.push('recent 2023-24 studies');
  if (/randomized/.test(text)) parts.push('RCT data');
  return parts.join(', ') || 'multi-source evidence';
}
