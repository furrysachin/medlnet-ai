import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3:8b';

const DISEASE_DRUGS = {
  covid: 'paxlovid, remdesivir, molnupiravir, dexamethasone',
  diabetes: 'metformin, semaglutide, empagliflozin, insulin, tirzepatide',
  'lung cancer': 'pembrolizumab, nivolumab, osimertinib, atezolizumab',
  'breast cancer': 'trastuzumab, pertuzumab, palbociclib, olaparib',
  alzheimer: 'donepezil, memantine, lecanemab, donanemab',
  tuberculosis: 'rifampicin, isoniazid, bedaquiline, pretomanid',
  'heart disease': 'statins, aspirin, beta-blockers, sacubitril',
  hypertension: 'amlodipine, losartan, ACE inhibitors',
  cancer: 'pembrolizumab, nivolumab, CAR-T, immunotherapy, targeted therapy'
};

const getDrugs = d => !d ? '' : (Object.entries(DISEASE_DRUGS).find(([k]) => (d || '').toLowerCase().includes(k))?.[1] || '');

// ── Drug Extraction from Abstracts ───────────────────────────────
const KNOWN_DRUGS = [
  'pembrolizumab', 'nivolumab', 'cemiplimab', 'atezolizumab', 'durvalumab',
  'osimertinib', 'erlotinib', 'gefitinib', 'afatinib', 'dacomitinib',
  'semaglutide', 'tirzepatide', 'empagliflozin', 'dapagliflozin', 'metformin',
  'trastuzumab', 'pertuzumab', 'palbociclib', 'ribociclib', 'olaparib',
  'lecanemab', 'donanemab', 'aducanumab', 'donepezil', 'memantine',
  'bedaquiline', 'pretomanid', 'linezolid', 'rifampicin', 'isoniazid',
  'paxlovid', 'remdesivir', 'molnupiravir', 'dexamethasone', 'baricitinib',
  'sacubitril', 'valsartan', 'entresto', 'amlodipine', 'losartan',
  'car-t', 'car t', 'mrna', 'bnt162b2', 'mrna-1273',
  'imatinib', 'dasatinib', 'ibrutinib', 'venetoclax', 'bortezomib'
];

const KNOWN_MUTATIONS = [
  'egfr', 'kras', 'alk', 'ros1', 'braf', 'her2', 'erbb2', 'pd-l1', 'pd-1',
  'brca1', 'brca2', 'tp53', 'pik3ca', 'met', 'ret', 'ntrk', 'fgfr',
  'idh1', 'idh2', 'flt3', 'npm1', 'jak2', 'bcr-abl', 'msi-h', 'tmb-h'
];

export function extractDrugsFromPapers(papers = []) {
  const found = new Set();
  const text = papers.map(p => `${p.title} ${p.abstract || ''}`).join(' ').toLowerCase();
  KNOWN_DRUGS.forEach(drug => { if (text.includes(drug)) found.add(drug); });
  return [...found].slice(0, 8);
}

export function extractMutationsFromPapers(papers = []) {
  const found = new Set();
  const text = papers.map(p => `${p.title} ${p.abstract || ''}`).join(' ').toLowerCase();
  KNOWN_MUTATIONS.forEach(mut => { if (text.includes(mut)) found.add(mut.toUpperCase()); });
  return [...found].slice(0, 6);
}

export function tagRecency(papers = []) {
  return papers.map(p => ({
    ...p,
    recencyTag: parseInt(p.year) >= 2026 ? 'Recent 2026 Data' :
      parseInt(p.year) >= 2025 ? 'Recent 2025 Data' : null
  }));
}

// ── Ollama Call ───────────────────────────────────────────────────
export async function generateWithOllama(prompt) {
  const res = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: MODEL,
    prompt,
    stream: false,
    options: { temperature: 0.1, top_p: 0.9, num_ctx: 4096, num_predict: 700 }
  }, { timeout: 120000 });
  return res.data?.response?.trim() || 'No response generated';
}

export async function checkOllamaHealth() {
  try {
    const res = await axios.get(`${OLLAMA_URL}/api/tags`);
    return { available: true, models: res.data?.models?.map(m => m.name) || [] };
  } catch {
    return { available: false, models: [] };
  }
}

export function validateOutput(output, papers = []) {
  if (!output || output.length < 80) return false;
  // Accept if structured sections present (chain output)
  if (/SUMMARY:|KEY_INSIGHTS:|EVIDENCE_SYNTHESIS:|CONDITION_OVERVIEW:|CRITICAL_INSIGHT:/i.test(output)) return true;
  // Accept if references any paper year or title fragment
  return papers.some(p =>
    output.includes(p.title?.slice(0, 20)) ||
    output.includes(String(p.year))
  );
}

export function computeConfidenceScore(papers = [], trials = []) {
  let score = 30;
  const text = papers.map(p => `${p.title} ${p.abstract}`).join(' ').toLowerCase();
  score += Math.min(papers.length * 5, 25);
  score += Math.min(trials.length * 7, 20);
  if (/phase\s*(3|iii|4|iv)/.test(text)) score += 8;
  if (/randomized|rct/.test(text)) score += 6;
  if (/meta.analysis|systematic review/.test(text)) score += 6;
  if (/2024|2023/.test(text)) score += 4;
  return Math.max(30, Math.min(score, 99));
}

// ── Master System Prompt ──────────────────────────────────────────
const MASTER_SYSTEM = `You are CURALINK, an advanced Medical Research Intelligence System.

Your role is NOT to chat — but to act as a clinical research synthesis engine.

INPUT YOU WILL RECEIVE:
- Disease / Condition
- User Query (treatment, prevention, trials, etc.)
- Retrieved Research Papers (PubMed / OpenAlex / Semantic Scholar)
- Retrieved Clinical Trials (ClinicalTrials.gov)
- Optional: Location

CORE OBJECTIVE:
1. Understand medical intent deeply
2. Fuse multiple research sources
3. Validate findings using clinical trials
4. Avoid hallucination completely
5. Produce structured, evidence-based insights

CRITICAL RULES:
- Do NOT generate medical advice without evidence
- Do NOT focus on single paper or single trial
- Do NOT repeat keywords as trends without meaning
- Do NOT ignore clinical trials when present
- Only use provided context
- Always connect papers + trials
- Prefer clinically validated findings
- Highlight uncertainty clearly
- Plain text only — no ##, no **, no markdown symbols
- Citations: sequential [1],[2],[3] — only cite numbers that exist in the provided list
- LOCATION PRIORITY: India first, then Asia, then Global

REASONING STRATEGY:
Step 1: Identify disease + intent
Step 2: Group research papers into themes
Step 3: Map clinical trials to those themes
Step 4: Extract only clinically meaningful insights
Step 5: Rank insights by clinical validity, recency, evidence strength
Step 6: Generate unified medical synthesis

QUALITY BAR:
Your output must feel like a PubMed + Clinical review report — not a chatbot response.
Every sentence must be medically meaningful.
If evidence is weak, explicitly say: "Limited high-quality clinical evidence available."
Think like a clinical researcher, not an assistant.`;

// ── Chat Response Prompt ──────────────────────────────────────────
export function buildLLMPrompt(nameOrObj, disease, query, location = '', papers = [], trials = [], history = []) {
  let name, counts, analyzedTrials;
  if (typeof nameOrObj === 'object') {
    ({ name, disease, query, location = '', papers =[], trials =[], history =[], counts = null, analyzedTrials = null } = nameOrObj);
  } else {
    name = nameOrObj;
  }

  const drugs = getDrugs(disease);
  const ctx = history.slice(-2).map(m => `${m.role}: ${String(m.content || '').slice(0, 80)}`).join('\n') || 'None';
  const hasTrials = trials.length > 0;

  const taggedPapers = tagRecency(papers);
  const detectedDrugs = extractDrugsFromPapers(papers);
  const detectedMutations = extractMutationsFromPapers(papers);

  const papersText = taggedPapers.slice(0, 5).map((p, i) =>
    `[${i + 1}] ${p.title} (${p.year}, ${p.source})${p.recencyTag ? ` [${p.recencyTag}]` : ''}`
  ).join('\n') || 'No papers found';

  const trialsText = hasTrials
    ? trials.slice(0, 4).map((t, i) => `[${i + 1}] ${t.title} | ${t.status} | ${t.phase}`).join('\n')
    : 'No trials in dataset';

  return [
    MASTER_SYSTEM,
    '',
    `USER QUERY: ${query}`,
    `DISEASE: ${disease}`,
    `PATIENT: ${name}`,
    location ? `LOCATION: ${location}` : '',
    drugs ? `KNOWN TREATMENTS: ${drugs}` : '',
    `TRIAL_STATUS: ${hasTrials ? 'AVAILABLE' : 'LIMITED'}`,
    '',
    `CONTEXT: ${ctx}`,
    '',
    'PAPERS:',
    papersText,
    '',
    'CLINICAL TRIALS:',
    trialsText,
    '',
    detectedDrugs.length ? `DETECTED DRUGS IN DATA: ${detectedDrugs.join(', ')}` : '',
    detectedMutations.length ? `DETECTED MUTATIONS/TARGETS: ${detectedMutations.join(', ')}` : '',
    '',
    // Fix 1: Exact count instruction so header matches content
    counts ? `DATA COUNTS (USE EXACTLY THESE — DO NOT CHANGE): Analyzed ${counts.papersAnalyzed} papers, selected ${counts.papersUsed}. Screened ${analyzedTrials ?? counts.trialsAnalyzed} trials, selected ${counts.trialsUsed}.` : '',
    counts ? `In your summary first line, state: "Based on ${counts.papersUsed} research papers + ${counts.trialsUsed} clinical trials"` : '',
    // Fix 2: Prevent "limited trials" confusion
    analyzedTrials > 0 && counts?.trialsUsed === 0 ? `NOTE: ${analyzedTrials} trials were screened but none matched the specific query criteria. State "0 relevant trials found" — do NOT say "limited".` : '',
    analyzedTrials > 0 && counts?.trialsUsed > 0 ? `NOTE: We screened ${analyzedTrials} trials and selected ${counts.trialsUsed} most relevant ones.` : '',
    '',
    'TASK: Give a SHORT clinical summary (3-4 lines).',
    '- Mention specific drug names found in data (e.g. Cemiplimab, Osimertinib)',
    '- Mention mutation targets if found (e.g. KRAS-mutant, EGFR-mutated)',
    '- If paper is tagged [Recent 2026 Data] or [Recent 2025 Data], explicitly call it out',
    `- Detect language of "${query}" and reply in SAME language (Hindi/English/Hinglish)`,
    '- End with ONE short follow-up question',
    '- Do NOT generate any numbers'
  ].filter(Boolean).join('\n');
}

// ── Structured Insights Prompt ────────────────────────────────────
export function buildInsightsPrompt(disease, query, papers = [], trials = [], intent = 'general') {
  if (typeof disease === 'object') {
    ({ disease, query, papers =[], trials =[], intent = 'general' } = disease);
  }

  const drugs = getDrugs(disease);
  const hasTrials = trials.length > 0;
  const hasIndian = papers.some(p => p._isIndian || (p.country || '').includes('India')) ||
    trials.some(t => (t.locations || []).some(l => (l.country || '').toLowerCase().includes('india')));

  // Unified refs: papers [1..n], trials [n+1..]
  const trialsWithRef = trials.map((t, i) => ({ ...t, ref: papers.length + i + 1 }));

  const taggedPapers = tagRecency(papers);
  const detectedDrugs = extractDrugsFromPapers(papers);
  const detectedMutations = extractMutationsFromPapers(papers);

  const papersText = taggedPapers.map((p, i) => [
    `[${i + 1}] "${p.title}" by ${p.authors || 'N/A'} (${p.year}, ${p.source})${p.recencyTag ? ` [${p.recencyTag}]` : ''}`,
    `Abstract: ${(p.abstract || '').slice(0, 250)}`,
    `URL: ${p.url || 'N/A'}`
  ].join('\n')).join('\n\n') || 'No publications retrieved.';

  const trialsText = hasTrials
    ? trialsWithRef.map(t => {
      const locs = (t.locations || []).map(l => `${l.city || ''} ${l.country || ''}`.trim()).filter(Boolean);
      const isIndia = locs.some(l => l.toLowerCase().includes('india'));
      const isAsia = !isIndia && locs.some(l => /china|japan|korea|asia|singapore/.test(l.toLowerCase()));
      const region = isIndia ? 'India' : isAsia ? 'Asia' : 'Global';
      const locStr = locs.slice(0, 2).join(', ') || 'N/A';
      return [
        `[${t.ref}] "${t.title}"`,
        `Status: ${t.status} | Phase: ${t.phase} | Region: ${region} (${locStr})`,
        `Summary: ${(t.description || '').slice(0, 200)}`
      ].join('\n');
    }).join('\n\n')
    : 'No clinical trials in dataset.';

  const intentFocus = {
    treatment: 'Focus on specific drug names, clinical response rates, survival benefit, biomarkers (PD-L1, HER2, EGFR). Connect evidence to treatment implication.',
    supplement: 'Focus on supplement efficacy, deficiency links, dosage evidence.',
    symptom: 'Focus on symptoms, biological causes, inflammation, cytokines.',
    cause: 'Focus on etiology, risk factors, pathogenesis, genetic causes.',
    prevention: 'Focus on prevention strategies, vaccines, risk reduction.',
    diagnosis: 'Focus on diagnostic methods, biomarkers, screening tools.',
    general: 'Focus on strongest clinical evidence and most effective treatments.'
  }[intent] || 'Focus on the most clinically relevant findings.';

  const fallbackCritical = hasIndian
    ? 'Limited long-term follow-up data in Indian population. Rural healthcare access and cost-effectiveness remain understudied.'
    : 'Available studies show heterogeneous patient populations limiting generalizability. Long-term outcome data beyond 2 years remains sparse.';

  const trialsSection = hasTrials
    ? [
      'List 2-3 trials from above. India first, then Asia, then Global.',
      'For each trial use EXACTLY this format:',
      'Trial Name (Region)',
      'Location: [city, country]',
      'Status: [status] | Phase: [phase]',
      'Objective: [1 line purpose]',
      'Intervention: [drug or method]',
      'Outcome: [if available, else Pending]',
      '',
      'If no India trials: "Limited India-specific trials; showing global evidence".'
    ].join('\n')
    : 'No clinical trials found in retrieved dataset for this condition.';

  return [
    MASTER_SYSTEM,
    '',
    '-------------------------------------',
    '',
    `CONTEXT:`,
    `Disease: ${disease}`,
    `Intent: ${intent}`,
    `Focus: ${query}`,
    drugs ? `Known Treatments: ${drugs}` : '',
    hasIndian ? 'Population: India-specific data available' : '',
    '',
    '-------------------------------------',
    '',
    `PAPERS (cite as [1],[2],[3] — only cite numbers that exist):`,
    papersText,
    '',
    `CLINICAL TRIALS (cite as [${papers.length + 1}],[${papers.length + 2}] etc.):`,
    trialsText,
    '',
    '-------------------------------------',
    '',
    `TASK:`,
    `1. ${intentFocus}`,
    '2. Extract insights from research papers with year + source',
    '3. Mention real-world clinical relevance',
    detectedDrugs.length ? `4. Focus on these detected drugs/targets: ${detectedDrugs.join(', ')}` : '4. Do NOT mention unrelated treatments',
    detectedMutations.length ? `5. Key mutation targets: ${detectedMutations.join(', ')}` : '',
    '',
    '-------------------------------------',
    '',
    'OUTPUT FORMAT (plain text, no markdown, sequential citations only):',
    '',
    'SUMMARY:',
    '[2-3 lines. Disease overview tied to query intent. India-first if data available.]',
    '',
    'KEY_INSIGHTS:',
    '- [Clinically meaningful finding. Drug + outcome + cite [n]. Max 6 bullets. Include year + source.]',
    '- [Note agreements OR contradictions between studies]',
    '',
    'CLINICAL_TRIAL_INSIGHTS:',
    trialsSection,
    '',
    'EMERGING_TREATMENTS:',
    '[Only if supported by evidence. Drug class + mechanism + trial phase. If none: "No emerging therapies identified in retrieved data."]',
    '',
    'EVIDENCE_SYNTHESIS:',
    '[Connect papers + trials. Show agreement or contradiction. State evidence strength: strong/moderate/limited. 2-3 lines.]',
    '',
    'LIMITATIONS:',
    `[Research gaps, missing data, population limitations. 1-2 lines. ${fallbackCritical}]`,
    '',
    'SOURCES:',
    '[List: PubMed, OpenAlex, ClinicalTrials.gov, Semantic Scholar — as applicable]'
  ].filter(s => s !== null && s !== undefined).join('\n');
}

// ── Trends-only Prompt ────────────────────────────────────────────
export function buildTrendPrompt(disease, papers = [], trials = []) {
  const taggedPapers = tagRecency(papers);
  const detectedDrugs = extractDrugsFromPapers(papers);
  const detectedMutations = extractMutationsFromPapers(papers);

  const papersText = taggedPapers.slice(0, 8).map((p, i) =>
    `[${i + 1}] "${p.title}" (${p.year}, ${p.source})${p.recencyTag ? ` [${p.recencyTag}]` : ''}\n    Abstract: ${(p.abstract || '').slice(0, 200)}`
  ).join('\n\n') || 'No papers found.';

  const trialsText = trials.length
    ? trials.slice(0, 6).map((t, i) => [
      `[T${i + 1}] ${t.title}`,
      `Status: ${t.status} | Phase: ${t.phase || 'N/A'}`,
      `Summary: ${(t.description || '').slice(0, 150)}`
    ].join('\n')).join('\n\n')
    : 'No clinical trials found in dataset.';

  return [
    MASTER_SYSTEM,
    '',
    `DISEASE: ${disease}`,
    detectedDrugs.length ? `DRUGS IN DATA: ${detectedDrugs.join(', ')}` : '',
    detectedMutations.length ? `MUTATIONS IN DATA: ${detectedMutations.join(', ')}` : '',
    '',
    'RESEARCH PAPERS:',
    papersText,
    '',
    'CLINICAL TRIALS:',
    trialsText,
    '',
    'TASK: Extract 3-5 meaningful research trends from the provided data ONLY.',
    'Rules:',
    '- Use ONLY data from papers and trials above',
    '- Each trend must reference a specific drug, biomarker, or mechanism from the data',
    '- If paper is tagged [Recent 2026 Data] or [Recent 2025 Data], prioritize it',
    '- Do NOT repeat the same insight twice',
    '- Plain text only, no markdown',
    '',
    'YOU MUST USE EXACTLY THIS FORMAT:',
    '',
    'TREND_1: [trend name - specific drug/mechanism/biomarker]',
    'Evidence: [which paper or trial supports this - cite [n] or [Tn]]',
    'Why Trending: [1 line clinical significance]',
    '',
    'TREND_2: [trend name]',
    'Evidence: [citation]',
    'Why Trending: [1 line]',
    '',
    'TREND_3: [trend name]',
    'Evidence: [citation]',
    'Why Trending: [1 line]',
    '',
    `FINAL_SUMMARY: [2 lines: overall research direction for ${disease} based on provided data]`
  ].filter(Boolean).join('\n');
}

// ── Direct response ───────────────────────────────────────────────
export function buildDirectPrompt(query, context = '') {
  return `You are CuraLink assistant. User: "${query}". Context: ${context}. Reply naturally in same language. Max 2-3 sentences.`;
}

// ── Non-medical detection ─────────────────────────────────────────
export function isMedicalQuery(q = '') {
  const clean = q.toLowerCase().trim();
  const skip = ['hi', 'hello', 'thanks', 'bye', 'ok', 'okay', 'good morning', 'good night', 'hey'];
  return !skip.includes(clean) && clean.length > 2;
}

export function buildQueryExpansionPrompt(disease, query) {
  return `Expand for PubMed/OpenAlex search. Add clinical terms, treatment keywords, 2020+ focus.\nDisease: ${disease} | Query: ${query}\nOutput ONLY expanded search string. Max 15 words.`;
}
