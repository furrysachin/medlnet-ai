import { useState } from 'react';
import { TrendingUp, FlaskConical, Zap, ChevronDown, ChevronUp, Loader, ExternalLink, Star } from 'lucide-react';
import { getTrends } from '../api';

const QUICK_DISEASES = [
  { label: 'Cancer', icon: '🧬', color: '#f87171' },
  { label: 'Diabetes', icon: '🩸', color: '#34d399' },
  { label: 'Alzheimer', icon: '🧠', color: '#a78bfa' },
  { label: 'Hypertension', icon: '❤️', color: '#60a5fa' },
  { label: 'COVID-19', icon: '🦠', color: '#fbbf24' },
  { label: 'Lung Cancer', icon: '🫁', color: '#fb923c' },
];

function TrendCard({ trend, index }) {
  const [open, setOpen] = useState(false);
  const colors = ['#60a5fa', '#34d399', '#a78bfa'];
  const color = colors[index % colors.length];
  return (
    <div className="glass rounded-2xl p-4 fade-in" style={{ borderLeft: `2px solid ${color}40` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>#{index + 1}</span>
          <p className="text-sm font-semibold text-white">{trend.name}</p>
        </div>
        <button onClick={() => setOpen(!open)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-2 fade-in">
          {trend.evidence && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Evidence</p>
              <p className="text-xs text-slate-300 leading-relaxed">{trend.evidence}</p>
            </div>
          )}
          {trend.why && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Why Trending</p>
              <p className="text-xs text-slate-300 leading-relaxed">{trend.why}</p>
            </div>
          )}
          {trend.url && (
            <a href={trend.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1">
              <ExternalLink size={10} /> View paper
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function HighlyCitedCard({ paper }) {
  return (
    <div className="glass rounded-xl p-3 fade-in" style={{ borderLeft: '2px solid rgba(251,191,36,0.4)' }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-slate-200 leading-snug flex-1 line-clamp-2">{paper.name}</p>
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400 shrink-0">
            <ExternalLink size={10} />
          </a>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="flex items-center gap-1 text-xs text-yellow-400">
          <Star size={9} fill="currentColor" /> {paper.citationCount} citations
        </span>
        {paper.year && <span className="text-xs text-slate-500">{paper.year}</span>}
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>Semantic Scholar</span>
      </div>
    </div>
  );
}

export default function TrendPanel({ onClose }) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFetch = async (disease) => {
    setSelected(disease);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await getTrends(disease);
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-blue-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Research Trend Detector</h2>
          </div>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">✕ Close</button>
        </div>
        <p className="text-xs text-slate-500 mt-1">PubMed · OpenAlex · ClinicalTrials · Semantic Scholar</p>
      </div>

      {/* Quick select chips */}
      <div className="shrink-0 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {QUICK_DISEASES.map(({ label, icon, color }) => (
            <button key={label} onClick={() => handleFetch(label)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: selected === label ? `${color}20` : 'rgba(255,255,255,0.04)',
                border: selected === label ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.08)',
                color: selected === label ? color : '#64748b'
              }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader size={20} className="text-blue-400 animate-spin" />
            <p className="text-xs text-blue-400/70 animate-pulse">Fetching from PubMed, OpenAlex &amp; Semantic Scholar...</p>
          </div>
        )}

        {error && (
          <div className="glass rounded-xl p-4 border-l-2 border-red-500/50">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-3 fade-in">

            {/* Source badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(result.meta?.sources || ['PubMed','OpenAlex','ClinicalTrials.gov','Semantic Scholar']).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>{s}</span>
              ))}
              <span className="text-xs text-slate-500">{result.meta?.papersAnalyzed || 0} papers analyzed</span>
            </div>

            {/* Summary */}
            {result.summary && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(79,157,255,0.08)', border: '1px solid rgba(79,157,255,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={13} className="text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Research Direction</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{result.summary}</p>
              </div>
            )}

            {/* LLM Trend cards */}
            {result.trends?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider px-1">Top Trends</p>
                {result.trends.map((t, i) => <TrendCard key={i} trend={t} index={i} />)}
              </div>
            )}

            {/* Semantic Scholar highly-cited */}
            {result.highlyCited?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <Star size={10} className="text-yellow-400" /> Highly Cited Papers
                </p>
                {result.highlyCited.map((p, i) => <HighlyCitedCard key={i} paper={p} />)}
              </div>
            )}

            {/* Detected signals bar */}
            {result.detectedTrends?.length > 0 && (
              <div className="glass rounded-2xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Signal Strength</p>
                <div className="space-y-2">
                  {result.detectedTrends.slice(0, 6).map(({ trend, score }) => (
                    <div key={trend} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-32 shrink-0 capitalize">{trend}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(score * 15, 100)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-4">{score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trial count */}
            {result.trials?.length > 0 && (
              <div className="glass rounded-xl p-3 flex items-center gap-3">
                <FlaskConical size={14} className="text-green-400 shrink-0" />
                <p className="text-xs text-slate-400">
                  <span className="text-green-400 font-semibold">{result.trials.length}</span> clinical trials · <span className="text-blue-400 font-semibold">{result.meta?.semanticPapers || 0}</span> Semantic Scholar papers
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp size={32} className="text-blue-400/30 mb-3" />
            <p className="text-slate-500 text-sm">Select a disease above to detect trends</p>
            <p className="text-slate-600 text-xs mt-1">Powered by 4 research sources</p>
          </div>
        )}
      </div>
    </div>
  );
}
