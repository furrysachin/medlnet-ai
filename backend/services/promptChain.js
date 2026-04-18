// ── 4-Stage Prompt Chaining System ───────────────────────────────
import { generateWithOllama } from './llm.js';

// ── Safe JSON Parser ──────────────────────────────────────────────
function safeParseJSON(text, fallback) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
}

// ── Single-pass chain (replaces 4 sequential LLM calls) ─────────
export async function runPromptChain(query, disease, location, papers, trials, intent) {
  const papersText = papers.slice(0, 6).map((p, i) =>
    `[${i+1}] "${p.title}" (${p.year}, ${p.source}) - ${(p.abstract||'').slice(0,180)}`
  ).join('\n\n') || 'No papers.';

  const trialsText = trials.slice(0, 4).map((t, i) => {
    const locs = (t.locations||[]).map(l => `${l.city||''} ${l.country||''}`.trim()).filter(Boolean);
    const isIndia = locs.some(l => l.toLowerCase().includes('india'));
    const region = isIndia ? 'India' : locs[0] || 'Global';
    return [
      `[T${i+1}] ${t.title} (${region})`,
      `Status: ${t.status} | Phase: ${t.phase}`,
      `Objective: ${(t.description||'').slice(0,120)}`
    ].join('\n');
  }).join('\n\n') || 'No trials.';

  const prompt = [
    'You are CuraLink AI, a clinical research synthesis engine.',
    'Use ONLY the provided papers and trials. No hallucination.',
    'Plain text only — no ##, no **.',
    '',
    `DISEASE: ${disease}`,
    `QUERY: ${query}`,
    `INTENT: ${intent}`,
    '',
    'PAPERS:',
    papersText,
    '',
    'TRIALS:',
    trialsText,
    '',
    'Generate output in EXACTLY this structure:',
    '',
    'SUMMARY:',
    '[1-2 line clinical overview]',
    '',
    'KEY_INSIGHTS:',
    '- [specific drug/outcome/finding from papers, max 5 bullets]',
    '',
    'CONDITION_OVERVIEW:',
    '[2 lines from evidence]',
    '',
    'EVIDENCE_SYNTHESIS:',
    '[2-3 lines: pharmacological + emerging therapies]',
    '',
    'TRIALS_CONNECTION:',
    '[1-2 trial blocks: Name, Status, Phase, Objective]',
    '',
    'RESEARCH_TRENDS:',
    '- [3 trends from data]',
    '',
    'CRITICAL_INSIGHT:',
    '[1-2 lines: gaps and limitations]'
  ].join('\n');

  const finalOutput = await generateWithOllama(prompt);
  return {
    understood:       { disease, intent, expanded_query: `${disease} ${query}` },
    retrievalQueries: {},
    reasoning:        { evidence_strength: 'moderate', top_drugs: [] },
    finalOutput
  };
}
