// ─────────────────────────────────────────────────────────────
// 🧠 AI Medical Research Pipeline (Clean Production Version)
// ─────────────────────────────────────────────────────────────

// =========================
// 1. DISEASE KNOWLEDGE BASE
// =========================
export const diseaseConfig = {
  'covid-19': {
    aliases: ['covid', 'sars-cov-2', 'coronavirus', 'covid19'],
    treatments: ['paxlovid', 'remdesivir', 'molnupiravir', 'dexamethasone'],
    symptoms: ['fever', 'cough', 'dyspnea', 'fatigue'],
    supplements: ['vitamin d', 'zinc', 'omega-3'],
    causes: ['virus', 'ace2', 'spike protein']
  },

  diabetes: {
    aliases: ['diabetes', 't2dm', 'diabetes mellitus'],
    treatments: ['insulin', 'metformin', 'semaglutide', 'sglt2'],
    symptoms: ['hyperglycemia', 'polyuria', 'thirst'],
    supplements: ['magnesium', 'berberine', 'chromium'],
    causes: ['insulin resistance', 'obesity', 'beta cell']
  },

  'lung cancer': {
    aliases: ['lung cancer', 'nsclc', 'sclc'],
    treatments: ['pembrolizumab', 'osimertinib', 'chemotherapy'],
    symptoms: ['dyspnea', 'hemoptysis', 'tumor'],
    supplements: ['vitamin d', 'antioxidant'],
    causes: ['smoking', 'egfr', 'kras']
  }
};

// =========================
// 2. CONFIG ENGINE
// =========================
export function getConfig(disease = '') {
  const d = (disease || '').toLowerCase().trim();
  if (!d) return { aliases: [], treatments: [], symptoms: [], supplements: [], causes: [] };
  if (diseaseConfig[d]) return diseaseConfig[d];
  for (const [key, cfg] of Object.entries(diseaseConfig)) {
    if (d.includes(key)) return cfg;
    if (cfg.aliases?.some(a => d.includes(a))) return cfg;
  }
  return { aliases: [d], treatments: [], symptoms: [], supplements: [], causes: [] };
}

// =========================
// 3. INPUT PARSER
// =========================
export function parseInput(body = {}) {
  return {
    disease: body.disease?.trim() || '',
    query: body.query?.trim() || '',
    name: body.name?.trim() || 'Patient',
    location: body.location?.trim() || '',
    history: body.history || [],
    sessionId: body.sessionId || 'default'
  };
}

// =========================
// 4. CONTEXT MEMORY
// =========================
const memory = new Map();

export const context = {
  get(id) {
    return memory.get(id) || { disease: null, query: null, location: null };
  },

  update(id, input) {
    const prev = this.get(id);
    const updated = { ...prev, ...input };
    memory.set(id, updated);
    return updated;
  }
};

// =========================
// 5. INTENT DETECTION
// =========================
export function detectIntent(q = '') {
  const x = q.toLowerCase();

  if (/treatment|drug|therapy|medicine/.test(x)) return 'treatment';
  if (/vitamin|supplement|mineral/.test(x)) return 'supplement';
  if (/symptom|pain|fever|fatigue/.test(x)) return 'symptom';
  if (/cause|why|mutation|etiology/.test(x)) return 'cause';
  if (/prevent|risk/.test(x)) return 'prevention';
  if (/diagnos|test|scan/.test(x)) return 'diagnosis';
  if (/trial|study|research/.test(x)) return 'research';

  return 'general';
}

// =========================
// 5c. SEARCH SANITIZER (CRITICAL FOR API SUCCESS)
export function sanitizeForSearch(query = '', disease = '') {
  const q = query.toLowerCase();
  // Remove noise words that fail PubMed/OpenAlex
  const noise = ['latest', 'results', 'finding', 'recent', 'global', 'updates', 'current', 'news', 'paper', 'article', 'study', 'research'];
  let clean = q;
  noise.forEach(w => {
    clean = clean.replace(new RegExp(`\\b${w}\\b`, 'g'), '');
  });
  
  // Extract key medical terms
  const keywords = clean.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
  return keywords.length > 0 ? keywords.join(' ') : disease;
}

export function extractKeywords(query = '', disease = '', intent = '') {
  const base = `${query} ${disease} ${intent}`.toLowerCase();
  const stopWords = new Set(['with', 'from', 'that', 'this', 'have', 'what', 'does', 'into', 'your', 'about', 'more', 'also']);
  const keywords = base
    .replace(/[^\w\s]/gi, '')
    .split(' ')
    .filter(w => w.length > 3 && !stopWords.has(w));
  return [...new Set(keywords)];
}

// =========================
// 6. QUERY BUILDER (CORE)
// =========================
export function buildQuery(disease = '', query = '', intent = 'general') {
  const cfg = getConfig(disease);
  const base = cfg.aliases.slice(0, 2).join(' OR ') || disease;

  const pack = (arr) => arr.length > 0 ? arr.slice(0, 3).join(' OR ') : query;

  const map = {
    treatment: {
      pubmed: `(${base}) AND (${pack(cfg.treatments)}) AND (clinical trial OR therapy OR randomized)`,
      openalex: `${disease} ${cfg.treatments.slice(0, 3).join(' ')} clinical trial`
    },
    supplement: {
      pubmed: `(${base}) AND (${pack(cfg.supplements)}) AND (supplement OR deficiency OR randomized)`,
      openalex: `${disease} ${cfg.supplements.slice(0, 2).join(' ')} supplementation`
    },
    symptom: {
      pubmed: `(${base}) AND (${pack(cfg.symptoms)}) AND (mechanism OR inflammation)`,
      openalex: `${disease} symptom mechanism inflammation`
    },
    cause: {
      pubmed: `(${base}) AND (${pack(cfg.causes)}) AND (pathogenesis OR mechanism)`,
      openalex: `${disease} causes mechanism pathology`
    }
  };

  return map[intent] || {
    pubmed: `(${base}) AND (${query}) AND (treatment OR therapy OR clinical trial OR mechanism)`,
    openalex: `${disease} ${query} treatment outcomes`
  };
}

// =========================
// 7. QUERY EXPANSION (Intelligence Layer)
// =========================

// Medical synonym map — expands abbreviations + adds clinical context
const MEDICAL_SYNONYMS = {
  // Biomarkers / liquid biopsy
  'cell free dna':    ['cfDNA', 'circulating tumor DNA', 'ctDNA', 'liquid biopsy', 'cell-free DNA'],
  'cfdna':            ['cfDNA', 'ctDNA', 'circulating tumor DNA', 'liquid biopsy'],
  'ctdna':            ['circulating tumor DNA', 'cell-free DNA', 'cfDNA', 'liquid biopsy'],
  'liquid biopsy':    ['cfDNA', 'ctDNA', 'circulating tumor DNA', 'cell-free DNA'],
  'biomarker':        ['biomarker', 'molecular marker', 'diagnostic marker'],

  // Cancer / oncology
  'nsclc':            ['non-small cell lung cancer', 'NSCLC', 'lung adenocarcinoma', 'lung squamous'],
  'non small cell':   ['NSCLC', 'non-small cell lung cancer', 'lung adenocarcinoma'],
  'lung cancer':      ['NSCLC', 'SCLC', 'lung adenocarcinoma', 'pulmonary carcinoma'],
  'breast cancer':    ['HER2', 'BRCA', 'triple negative', 'hormone receptor'],
  'colorectal':       ['CRC', 'colon cancer', 'rectal cancer', 'MSI'],

  // Mutations / targets
  'egfr':             ['EGFR mutation', 'epidermal growth factor receptor', 'osimertinib', 'erlotinib'],
  'kras':             ['KRAS mutation', 'KRAS G12C', 'sotorasib', 'adagrasib'],
  'alk':              ['ALK rearrangement', 'ALK fusion', 'crizotinib', 'alectinib'],
  'pd-l1':            ['PD-L1 expression', 'immune checkpoint', 'pembrolizumab'],
  'her2':             ['HER2 amplification', 'trastuzumab', 'pertuzumab', 'ERBB2'],

  // Diabetes
  'diabetes':         ['T2DM', 'type 2 diabetes', 'HbA1c', 'glycemic control', 'insulin resistance'],
  'glp-1':            ['semaglutide', 'liraglutide', 'GLP-1 receptor agonist', 'tirzepatide'],
  'sglt2':            ['empagliflozin', 'dapagliflozin', 'SGLT2 inhibitor', 'canagliflozin'],

  // Neurology
  'alzheimer':        ['amyloid beta', 'tau protein', 'lecanemab', 'donanemab', 'neurodegeneration'],
  'parkinson':        ['alpha-synuclein', 'dopamine', 'levodopa', 'deep brain stimulation'],

  // Cardiology
  'heart failure':    ['HFrEF', 'HFpEF', 'ejection fraction', 'sacubitril', 'BNP'],
  'hypertension':     ['blood pressure', 'ACE inhibitor', 'ARB', 'amlodipine', 'systolic'],

  // Infectious
  'tuberculosis':     ['TB', 'Mycobacterium tuberculosis', 'bedaquiline', 'rifampicin', 'MDR-TB'],
  'covid':            ['SARS-CoV-2', 'COVID-19', 'paxlovid', 'remdesivir', 'mRNA vaccine'],

  // Intent keywords
  'diagnosis':        ['diagnostic accuracy', 'sensitivity', 'specificity', 'screening', 'detection'],
  'early detection':  ['early stage', 'stage I', 'screening', 'sensitivity', 'biomarker'],
  'treatment':        ['therapy', 'clinical trial', 'randomized', 'efficacy', 'response rate'],
  'prevention':       ['risk reduction', 'prophylaxis', 'vaccine', 'intervention'],
};

export function expandQuery({ disease, query }) {
  const combined = `${query} ${disease}`.toLowerCase();
  const expansions = new Set();

  for (const [key, synonyms] of Object.entries(MEDICAL_SYNONYMS)) {
    if (combined.includes(key)) {
      synonyms.forEach(s => expansions.add(s));
    }
  }

  // Always add intent-based clinical terms
  const intent = detectIntent(query);
  const intentTerms = {
    diagnosis:  ['diagnostic', 'biomarker', 'sensitivity', 'specificity'],
    treatment:  ['clinical trial', 'randomized', 'efficacy', 'therapy'],
    prevention: ['risk reduction', 'prophylaxis', 'intervention'],
    cause:      ['pathogenesis', 'mechanism', 'etiology'],
    general:    ['clinical evidence', 'outcomes'],
  };
  (intentTerms[intent] || intentTerms.general).forEach(t => expansions.add(t));

  const expandedTerms = [...expansions].slice(0, 8);
  return `${query} ${disease} ${expandedTerms.join(' ')}`;
}

export function generateQueries(disease, query, intent) {
  const sanitized = sanitizeForSearch(query, disease);
  const expanded = expandQuery({ disease, query: sanitized });
  
  return [
    { pubmed: `${disease} AND ${sanitized}`, openalex: `${disease} ${sanitized}` },
    { pubmed: `${disease} AND (treatment OR therapy OR drug)`, openalex: `${disease} treatment outcomes` },
    { pubmed: `${disease} AND (clinical trial OR randomized OR rct)`, openalex: `${disease} clinical trials` },
    { pubmed: `${disease} AND newer`, openalex: `${disease} trends 2024` }
  ];
}

// =========================
// 8. TEXT UTILITIES
// =========================
const normalize = (t = '') =>
  t.toLowerCase().replace(/[^a-z0-9]/g, '');

export function deduplicate(items = []) {
  const seen = new Set();
  return items.filter(i => {
    if (!i || !i.title) return false;
    const key = (i.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// =========================
// 9. FILTER ENGINE
// =========================
export function filterPapers(papers = [], disease = '', query = '', intent = 'general') {
  const cfg = getConfig(disease);
  const keywords = extractKeywords(query, disease, intent);

  return papers.filter(p => {
    const text = `${p.title || ''} ${p.abstract || ''}`.toLowerCase();
    const hasDisease = cfg.aliases.some(a => text.includes(a));
    const hasKeyword = keywords.some(k => text.includes(k));
    const hasLength  = text.length > 80;
    return (hasDisease || hasKeyword) && hasLength;
  });
}

// =========================
// 10. SCORING ENGINE (CORE AI RANKER)
// =========================
export function scorePaper(p, disease = '', query = '', intent = 'general') {
  const cfg = getConfig(disease);
  const text = `${p.title || ''} ${p.abstract || ''}`.toLowerCase();
  const keywords = extractKeywords(query, disease, intent);
  let score = 0;

  // Disease alias match
  if (cfg.aliases.some(a => text.includes(a))) score += 5;

  // Keyword-based relevance scoring
  keywords.forEach(k => { if (text.includes(k)) score += 2; });

  // Drug boost
  cfg.treatments.forEach(t => { if (text.includes(t)) score += 4; });

  // India boost
  if (text.includes('india') || text.includes('indian')) score += 3;

  // Evidence quality
  if (/randomized|rct/.test(text)) score += 8;
  if (/meta-analysis|systematic/.test(text)) score += 6;
  if (/clinical trial/.test(text)) score += 5;

  // Recency
  const year = parseInt(p.year) || 2000;
  if (year >= 2023) score += 5;
  else if (year >= 2022) score += 3;
  else if (year >= 2020) score += 2;

  // Penalties
  if (/animal|mouse|in vitro/.test(text)) score -= 3;
  if (!p.abstract) score -= 5;

  // Penalize irrelevant papers for treatment queries
  if (intent === 'treatment' && !text.includes('treatment') && !text.includes('therapy') && !text.includes('drug')) score -= 4;

  // Penalize disease mismatch
  if (cfg.aliases.length > 0 && !cfg.aliases.some(a => text.includes(a))) score -= 5;

  return score;
}

// =========================
// 11. PAPER PIPELINE (FINAL)
// =========================
export function selectTopPapers(papers, disease, query, topN = 8) {
  const intent = detectIntent(query);

  let clean = filterPapers(papers, disease, query, intent);
  if (clean.length < 3) clean = papers.filter(p => (p.title || '').length > 0);

  return deduplicate(clean)
    .map(p => ({ ...p, score: scorePaper(p, disease, query, intent), intent }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

// =========================
// 12. CLINICAL TRIAL RANKER (INDIA-FIRST)
// =========================
export function selectTopTrials(trials = [], disease = '', intent = 'general', topN = 6) {
  const STATUS_PRIORITY = { RECRUITING: 5, ACTIVE_NOT_RECRUITING: 4, COMPLETED: 3, ENROLLING_BY_INVITATION: 2, NOT_YET_RECRUITING: 1 };
  const cfg = getConfig(disease);

  // Filter by disease relevance
  let filtered = trials.filter(t => {
    const text = `${t.title||''} ${t.description||''} ${t.officialTitle||''} ${(t.conditions||[]).join(' ')}`.toLowerCase();
    return cfg.aliases.some(a => text.includes(a)) || text.includes((disease||'').toLowerCase());
  });

  if (filtered.length < 2) filtered = trials;
  const pool = filtered.length > 0 ? filtered : trials;

  // Score: disease match + India priority + Phase 3 + status
  const scoreTrial = (t) => {
    let score = 0;
    const text = `${t.title||''} ${t.description||''}`.toLowerCase();
    const locs = (t.locations||[]).map(l => `${l.city||''} ${l.country||''}`.toLowerCase()).join(' ');

    if (cfg.aliases.some(a => text.includes(a))) score += 50;
    if (locs.includes('india')) score += 100;
    else if (/asia|china|japan|korea|singapore|thailand/.test(locs)) score += 50;
    if (/phase.*(3|iii|4|iv)/i.test(t.phase||'')) score += 20;
    score += (STATUS_PRIORITY[t.status] || 0) * 5;
    return score;
  };

  return pool
    .map(t => ({ ...t, _score: scoreTrial(t) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, topN);
}

// =========================
// 13. CONTEXT BUILDER
// =========================
export function buildContext(history = [], query = '', disease = '') {
  const last = history.slice(-3).map(h => h.query || h.content || '').filter(Boolean).join(' ');
  const isShort = query.split(' ').length <= 5;
  const merged = (isShort && disease) ? `${disease} ${query}` : query;
  return last ? `${last} ${merged}` : merged;
}

// =========================
// 14. FINAL PIPELINE EXPORT
// =========================
export function runPipeline(input, papers, trials) {
  const parsed = parseInput(input);
  const intent = detectIntent(parsed.query);

  const enrichedQuery = buildContext(parsed.history, parsed.query, parsed.disease);

  const queries = buildQuery(parsed.disease, enrichedQuery, intent);

  return {
    intent,
    queries,
    papers: selectTopPapers(papers, parsed.disease, parsed.query),
    trials: selectTopTrials(trials, parsed.disease),
    context: context.update(parsed.sessionId, parsed)
  };
}