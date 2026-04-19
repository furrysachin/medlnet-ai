import { useState, useEffect } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

function PaperCard({ paper, index }) {
  const [exp, setExp] = useState(false);
  const [hov, setHov] = useState(false);
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 transition-all fade-up"
      style={{ boxShadow: hov ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.04)', transform: hov ? 'translateY(-2px)' : 'none' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="flex items-start gap-2">
        <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 text-xs flex items-center justify-center shrink-0 font-medium mt-0.5">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-xs font-medium text-gray-900 leading-snug line-clamp-2 flex-1">{paper.title}</p>
            {paper.url && (
              <a href={paper.url} target="_blank" rel="noopener noreferrer"
                className="text-gray-300 hover:text-blue-500 shrink-0 transition-colors mt-0.5">
                <ExternalLink size={11} />
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{paper.source || 'PubMed'}</span>
            {paper.year && <span className="text-xs text-gray-400">{paper.year}</span>}
            {paper._isIndian && <span className="text-xs">🇮🇳</span>}
            {paper.country && !paper._isIndian && <span className="text-xs text-gray-400">{paper.country}</span>}
          </div>
          {paper.abstract && paper.abstract !== 'No abstract available' && (
            <>
              <button onClick={() => setExp(v => !v)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1.5">
                {exp ? <ChevronUp size={10} /> : <ChevronDown size={10} />} Abstract
              </button>
              {exp && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{paper.abstract}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TrialCard({ trial }) {
  const [hov, setHov] = useState(false);
  const rec  = trial.status === 'RECRUITING';
  const comp = trial.status === 'COMPLETED';
  const locs = (trial.locations || []);
  const locText = locs.slice(0,2).map(l => `${l.city||''} ${l.country||''}`.trim()).filter(Boolean).join(', ');
  const isIndia = locs.some(l => (l.country||'').toLowerCase().includes('india'));
  const isAsia  = !isIndia && locs.some(l => /china|japan|korea|singapore|thailand/.test((l.country||'').toLowerCase()));
  const regionBadge = isIndia ? { emoji: '🇮🇳', label: 'India', color: '#FF9933' }
    : isAsia ? { emoji: '🌏', label: 'Asia', color: '#0EA5E9' }
    : { emoji: '🌍', label: 'Global', color: '#6B7280' };
  const statusEmoji = rec ? '🟢' : comp ? '✅' : '🟡';

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 transition-all fade-up"
      style={{ boxShadow: hov ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.04)', transform: hov ? 'translateY(-2px)' : 'none' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-gray-900 leading-snug flex-1 line-clamp-2">{trial.title}</p>
        {trial.url && (
          <a href={trial.url} target="_blank" rel="noopener noreferrer"
            className="text-gray-300 hover:text-blue-500 shrink-0 transition-colors">
            <ExternalLink size={11} />
          </a>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium">{statusEmoji} {trial.status || 'Unknown'}</span>
        {trial.phase && trial.phase !== 'N/A' && trial.phase !== 'NA' && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">Phase: {trial.phase}</span>
        )}
        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${regionBadge.color}15`, color: regionBadge.color }}>
          {regionBadge.emoji} {regionBadge.label}
        </span>
        {locText && <span className="text-xs text-gray-400 truncate">{locText}</span>}
      </div>
    </div>
  );
}

function TrendsView({ trends, insights }) {
  const items = insights?.researchTrends?.filter(Boolean) || [];
  const sigs = trends?.signals || {};
  const top = trends?.topTrends || Object.keys(sigs).slice(0, 5);
  const direction = trends?.direction || insights?.evidenceSynthesis || '';

  if (!items.length && !top.length) {
    return <p className="text-xs text-gray-300 text-center py-8">Run a query to see research trends</p>;
  }

  return (
    <div className="space-y-2.5">
      {direction && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
          <p className="text-xs font-medium text-green-700 mb-1">Research Direction</p>
          <p className="text-xs text-gray-600">{direction}</p>
        </div>
      )}
      {items.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-3.5 space-y-2.5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Trending Topics</p>
          {items.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
              <p className="text-xs text-gray-700 leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
      )}
      {top.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-3.5 space-y-3">
          {top.map((t, i) => {
            const score = sigs[t] || 1;
            const max = Math.max(...top.map(k => sigs[k] || 1), 1);
            const pct = Math.round((score / max) * 100);
            const trendData = (trends?.detectedTrends || []).find(s => s.trend.toLowerCase() === t.toLowerCase());
            return (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-xs text-gray-600 capitalize truncate">{t}</span>
                    {trendData?.url && (
                      <a href={trendData.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 transition-colors">
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{score}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="bar-fill" style={{ '--w': `${pct}%`, background: '#2563EB', animationDelay: `${i * 0.1}s` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResearchersView({ papers }) {
  // Extract unique authors from papers
  const researchers = [];
  const seen = new Set();
  papers.forEach(p => {
    if (!p.authors || p.authors === 'N/A') return;
    p.authors.split(',').forEach(a => {
      const name = a.trim();
      if (name && !seen.has(name) && name.length > 3) {
        seen.add(name);
        researchers.push({ name, paper: p.title, year: p.year, source: p.source, url: p.url });
      }
    });
  });

  if (!researchers.length) return <p className="text-xs text-gray-300 text-center py-8">No researcher data</p>;

  return (
    <div className="space-y-2">
      {researchers.slice(0, 12).map((r, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 fade-up">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
              {r.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-medium text-gray-900 truncate">{r.name}</p>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 transition-colors">
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{r.paper?.slice(0, 40)}…</p>
            </div>
            <span className="text-xs text-gray-300 shrink-0">{r.year}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const TABS = [{ id: 'papers', label: 'Papers' }, { id: 'trials', label: 'Trials' }, { id: 'researchers', label: 'Researchers' }, { id: 'trends', label: 'Trends' }];

export default function EvidencePanel({ data, isLoading, activeTab: defaultTab }) {
  const [tab, setTab] = useState(defaultTab || 'papers');
  const { papers = [], trials = [], trends, insights } = data;

  // Auto-switch tab based on defaultTab prop
  useEffect(() => { if (defaultTab) setTab(defaultTab); }, [defaultTab]);

  return (
    <div className="w-72 shrink-0 h-full flex flex-col border-l border-gray-100 bg-gray-50">
      <div className="shrink-0 px-4 py-3 bg-white border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Evidence Sources</p>
        <p className="text-xs text-gray-400 mt-0.5">PubMed · OpenAlex · ClinicalTrials.gov</p>
      </div>

      <div className="shrink-0 flex bg-white border-b border-gray-100 px-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 text-xs font-medium transition-colors"
            style={{ color: tab === t.id ? '#1D4ED8' : '#9CA3AF', borderBottom: tab === t.id ? '2px solid #2563EB' : '2px solid transparent', marginBottom: '-1px' }}>
            {t.label}
            {t.id === 'papers' && papers.length > 0 && <span className="ml-1 text-gray-300">({papers.length})</span>}
            {t.id === 'trials' && trials.length > 0 && <span className="ml-1 text-gray-300">({trials.length})</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {tab === 'papers' && (
          papers.length > 0
            ? papers.slice(0, 8).map((p, i) => <PaperCard key={i} paper={p} index={i} />)
            : <p className="text-xs text-gray-300 text-center py-8">No papers yet</p>
        )}
        {tab === 'trials' && (
          trials.length > 0
            ? trials.slice(0, 6).map((t, i) => <TrialCard key={i} trial={t} />)
            : <p className="text-xs text-gray-300 text-center py-8">No trials yet</p>
        )}
        {tab === 'researchers' && <ResearchersView papers={papers} />}
        {tab === 'trends' && <TrendsView trends={trends} insights={insights} />}
      </div>
    </div>
  );
}
