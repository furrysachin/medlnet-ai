import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

const card = { background: '#fff', border: '1px solid #F3F4F6', borderRadius: '12px', padding: '14px', transition: 'all .2s ease' };

function Skeleton() {
  return (
    <div style={card} className="space-y-2.5">
      <div className="shimmer h-3.5 w-3/4" />
      <div className="shimmer h-3 w-1/2" />
      <div className="shimmer h-3 w-2/5" />
    </div>
  );
}

function Empty({ text }) {
  return <div className="flex items-center justify-center py-16"><p className="text-sm text-gray-300">{text}</p></div>;
}

function PaperCard({ paper }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ ...card, transform: hov ? 'translateY(-2px)' : 'none', boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)' }}
      className="fade-up" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 flex-1">{paper.title}</p>
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 mt-0.5 text-gray-300 hover:text-blue-600 transition-colors">
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
          {paper.source || 'PubMed'}
        </span>
        {paper.year && <span className="text-xs text-gray-400">{paper.year}</span>}
        {paper._isIndian && <span className="text-xs">🇮🇳</span>}
        {paper.country && !paper._isIndian && <span className="text-xs text-gray-400">{paper.country}</span>}
      </div>
      {paper.abstract && paper.abstract !== 'No abstract available' && (
        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{paper.abstract}</p>
      )}
    </div>
  );
}

function TrialCard({ trial }) {
  const [hov, setHov] = useState(false);
  const rec = trial.status === 'RECRUITING';
  return (
    <div style={{ ...card, transform: hov ? 'translateY(-2px)' : 'none', boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)' }}
      className="fade-up" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 flex-1">{trial.title}</p>
        {trial.url && (
          <a href={trial.url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 mt-0.5 text-gray-300 hover:text-blue-600 transition-colors">
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
          style={{ background: rec ? '#F0FDF4' : '#F9FAFB', color: rec ? '#16A34A' : '#9CA3AF', borderColor: rec ? '#BBF7D0' : '#E5E7EB' }}>
          {trial.status || 'Unknown'}
        </span>
        {trial.phase && trial.phase !== 'N/A' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">{trial.phase}</span>
        )}
      </div>
      {trial.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{trial.description}</p>}
    </div>
  );
}

function TrendsView({ trends, insights }) {
  // Support both shapes:
  // 1. insights.researchTrends — array of strings from chat response
  // 2. trends.signals/topTrends — legacy shape
  const items = insights?.researchTrends?.filter(Boolean) || [];
  const sigs = trends?.signals || {};
  const top = trends?.topTrends || Object.keys(sigs).filter(k => sigs[k] > 0).slice(0, 6);
  const direction = trends?.direction || insights?.evidenceSynthesis || '';

  if (!items.length && !top.length) return <Empty text="Run a query to see research trends" />;

  return (
    <div className="space-y-3 fade-up">
      {direction && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3.5">
          <p className="text-xs text-green-600 font-medium mb-1">Research Direction</p>
          <p className="text-sm text-gray-700">{direction}</p>
        </div>
      )}

      {/* Array of trend strings from chat insights */}
      {items.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-2.5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Trending Topics</p>
          {items.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-xs flex items-center justify-center font-bold">{i + 1}</span>
              <p className="text-xs text-gray-700 leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bar chart for signal-based trends */}
      {top.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3.5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Signal Strength</p>
          {top.map((t, i) => {
            const score = sigs[t] || 1;
            const max = Math.max(...top.map(k => sigs[k] || 1), 1);
            const pct = Math.round((score / max) * 100);
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 capitalize">{t}</span>
                  <span className="text-xs text-gray-400">{score}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                  <div className="conf-fill" style={{ '--w': `${pct}%`, background: '#2563EB', animationDelay: `${i * 0.1}s` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TABS = [{ id: 'papers', label: 'Papers' }, { id: 'trials', label: 'Trials' }, { id: 'trends', label: 'Trends' }];

export default function RightPanel({ data, isLoading }) {
  const [tab, setTab] = useState('papers');
  const { papers = [], trials = [], trends } = data;

  useEffect(() => { if (papers.length > 0 && !isLoading) setTab('papers'); }, [papers.length, isLoading]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="shrink-0 flex border-b border-gray-100 px-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-3.5 text-xs font-medium relative transition-colors"
            style={{ color: tab === t.id ? '#1D4ED8' : '#9CA3AF', borderBottom: tab === t.id ? '2px solid #2563EB' : '2px solid transparent', marginBottom: '-1px' }}>
            {t.label}
            {t.id === 'papers' && papers.length > 0 && <span className="ml-1 text-gray-300">({papers.length})</span>}
            {t.id === 'trials' && trials.length > 0 && <span className="ml-1 text-gray-300">({trials.length})</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isLoading
          ? [1, 2, 3].map(i => <Skeleton key={i} />)
          : tab === 'papers'
            ? papers.length > 0 ? papers.slice(0, 8).map((p, i) => <PaperCard key={i} paper={p} />) : <Empty text="Papers will appear after a query" />
            : tab === 'trials'
              ? trials.length > 0 ? trials.slice(0, 6).map((t, i) => <TrialCard key={i} trial={t} />) : <Empty text="Clinical trials will appear after a query" />
              : <TrendsView trends={trends} insights={data.insights} />
        }
      </div>
    </div>
  );
}
