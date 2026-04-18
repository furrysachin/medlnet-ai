// ─────────────────────────────────────────────
// 🚀 MEDICAL-GRADE RANKING ENGINE (v4 Final)
// ─────────────────────────────────────────────

function normalize(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

export function diseaseMatch(text, disease) {
  const t = normalize(text);
  return normalize(disease).split(' ').filter(Boolean).some(tok => t.includes(tok));
}

// ── Paper Ranking ─────────────────────────────
export function rankMedicalPapers(papers, disease, query, topK = 8) {
  if (!papers?.length) return [];

  const d = disease.toLowerCase();
  const q = query.toLowerCase();
  const seen = new Set();

  return papers
    .map(p => {
      const text = `${p.title || ''} ${p.abstract || ''}`.toLowerCase();
      let score = 0;

      // Core relevance
      if (text.includes(d)) score += 4;
      else return { ...p, score: -999 }; // hard disease lock

      if (text.includes(q)) score += 3;
      q.split(' ').filter(w => w.length > 3).forEach(w => {
        if (text.includes(w)) score += 1;
      });

      // Clinical strength
      if (/phase\s*(3|iii|4|iv)/.test(text)) score += 4;
      if (/phase\s*(2|ii)/.test(text)) score += 2;
      if (/randomized/.test(text)) score += 3;
      if (/clinical trial/.test(text)) score += 3;
      if (/meta.analysis|systematic review/.test(text)) score += 3;

      // Modern oncology / treatment boost
      if (/immunotherapy/.test(text)) score += 3;
      if (/car.t/.test(text)) score += 4;
      if (/mrna/.test(text)) score += 4;
      if (/targeted therapy/.test(text)) score += 3;
      if (/biomarker/.test(text)) score += 2;
      if (/liquid biopsy/.test(text)) score += 3;
      if (/precision medicine/.test(text)) score += 2;

      // Recency
      const year = parseInt(p.year) || 0;
      if (year >= 2024) score += 3;
      else if (year >= 2022) score += 2;
      else if (year > 0 && year < 2018) score -= 3;

      // Source credibility
      if (p.source === 'PubMed') score += 2;
      else if (p.source === 'OpenAlex') score += 1;

      // Citation boost
      const cites = p.citationCount || 0;
      if (cites > 200) score += 3;
      else if (cites > 50) score += 2;
      score += Math.min(cites / 100, 3);

      // Penalties
      if (!p.abstract || p.abstract.length < 50) score -= 4;
      if (/in vitro|animal model|mouse model/.test(text)) score -= 2;

      return { ...p, score };
    })
    .filter(p => p.score > -100)
    .filter(p => {
      const key = normalize(p.title || '').slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ── Clinical Trials Ranking ────────────────────
export function selectTopTrials(trials = [], disease, topK = 6) {
  if (!trials.length) return [];

  const d = disease.toLowerCase();

  const scored = trials.map(t => {
    const text = `${t.title || ''} ${t.phase || ''} ${t.status || ''} ${t.description || ''}`.toLowerCase();
    let score = 0;

    if (text.includes(d)) score += 4;
    if (/phase\s*(3|iii|4|iv)/.test(text)) score += 5;
    if (/phase\s*(2|ii)/.test(text)) score += 3;
    if (/recruiting/.test(text)) score += 3;
    if (/immunotherapy/.test(text)) score += 3;
    if (/car.t/.test(text)) score += 4;
    if (/targeted/.test(text)) score += 3;

    return { ...t, score };
  });

  const filtered = scored.filter(t => t.score > 0);
  return (filtered.length > 0 ? filtered : scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ── Trend Engine (v5 Professional) ───────────────────
export function detectResearchTrends(papers, trials, query = '') {
  const corpus = [...papers, ...trials]
    .map(p => `${p.title || ''} ${p.abstract || p.description || ''}`.toLowerCase())
    .join(' ');

  const stopWords = new Set(['the','and','for','with','from','that','this','were','have','been','their',
    'after','among','using','study','trial','patients','results','effect','effects','clinical',
    'treatment','disease','based','versus','compared','between','during','within','without',
    'through','across','under','over','into','about','which','when','where','while','these',
    'those','there','other','more','than','also','both','each','only','such','some','any',
    'all','not','but','can','may','was','are','has','had','its','our','we','in','of','on',
    'at','to','a','an','is','it','be','by','as','or','if','no','do','so','up','out','new',
    'use','used','high','low','type','risk','rate','data','age','sex','time','year','group',
    'groups','level','levels','total','mean','median','range','ratio','index','score','scale',
    'test','tests','analysis','review','meta','systematic','randomized','controlled','cohort',
    'observational','prospective','retrospective','double','blind','placebo','vs','et','al']);

  // 1. Bi-gram extraction for professional labels
  const getBigrams = (text) => {
    const words = text.toLowerCase().split(/[\s\-\/,;:()]+/).filter(w => w.length > 3 && !stopWords.has(w));
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i+1]}`);
    }
    return bigrams;
  };

  const bigramCounts = papers.flatMap(p => getBigrams(p.title || '')).reduce((acc, b) => {
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {});

  const bigramSignals = Object.entries(bigramCounts)
    .filter(([, c]) => c >= 2)
    .map(([b, c]) => ({ trend: b.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), score: c * 4, fromTitle: true }));

  // 2. Known medical signals (Expanded Oncology + Immunology)
  const medicalSignals = [
    'semaglutide','tirzepatide','pembrolizumab','nivolumab','cemiplimab','osimertinib','trastuzumab','palbociclib','olaparib',
    'car-t','mrna','immunotherapy','biomarker','precision medicine','liquid biopsy','targeted therapy',
    'pd-l1','pd-1','egfr','kras','her2','brca','tp53','alk','resistance mechanism','combination therapy','adjuvant therapy'
  ];

  const signalScores = medicalSignals
    .map(sig => ({ 
      trend: sig.charAt(0).toUpperCase() + sig.slice(1), 
      score: (corpus.split(sig).length - 1) * 2 
    }))
    .filter(t => t.score > 0);

  // 3. Merge + Smart Deduplication
  const all = [...bigramSignals, ...signalScores].sort((a, b) => b.score - a.score);
  const seen = new Set();
  const final = [];
  
  for (const item of all) {
    const norm = item.trend.toLowerCase();
    if ([...seen].some(s => s.includes(norm) || norm.includes(s))) continue;
    if (final.length >= 8) break;
    final.push(item);
    seen.add(norm);
  }
  
  return final;
}

// ── Hallucination Gate ────────────────────────
export function validateAgainstEvidence(output, papers) {
  if (!output || output.length < 80) return false;
  const text = normalize(output);
  return papers.some(p =>
    text.includes(normalize(p.title || '').slice(0, 20)) ||
    text.includes(String(p.year || '')) ||
    /\[\d+\]/.test(output)
  );
}
