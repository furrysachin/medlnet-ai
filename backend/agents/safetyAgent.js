const UNSAFE_PATTERNS = [
  'guaranteed cure', '100% effective', 'definitely cures',
  'no side effects', 'completely safe', 'miracle treatment',
  'always works', 'proven to cure', 'eliminates cancer completely'
];

const HALLUCINATION_PATTERNS = [
  /study by \w+ \d{4} found/i,
  /according to dr\./i,
  /harvard study/i,
  /fda approved in \d{4}/i
];

export function safetyAgent(answer, papers = []) {
  const flags = [];
  const lower = answer.toLowerCase();

  // Check unsafe medical claims
  UNSAFE_PATTERNS.forEach(p => {
    if (lower.includes(p)) flags.push({ type: 'unsafe_claim', pattern: p });
  });

  // Check potential hallucination patterns
  HALLUCINATION_PATTERNS.forEach(p => {
    if (p.test(answer)) flags.push({ type: 'potential_hallucination', pattern: p.toString() });
  });

  // Check if citations exist when papers provided
  if (papers.length > 0 && !/\[\d+\]/.test(answer)) {
    flags.push({ type: 'missing_citations', pattern: 'no [n] citations found' });
  }

  return {
    safe: flags.length === 0,
    flags,
    warning: flags.length > 0 ? `${flags.length} safety flag(s) detected` : null
  };
}
