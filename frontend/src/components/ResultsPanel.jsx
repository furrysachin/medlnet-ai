import { useState, useEffect } from 'react';
import { BookOpen, FlaskConical, Brain, Link2, TrendingUp, Lightbulb, AlertTriangle, GitMerge, Zap, Download, Shield, Activity } from 'lucide-react';
import { generateReport } from '../api';
import PaperCard from './PaperCard';
import TrialCard from './TrialCard';

const TABS = [
  { id: 'insights', label: 'AI Insights', icon: Brain },
  { id: 'papers', label: 'Papers', icon: BookOpen },
  { id: 'trials', label: 'Trials', icon: FlaskConical },
  { id: 'sources', label: 'Sources', icon: Link2 },
];

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
        <Icon size={22} className="text-blue-400/40" />
      </div>
      <p className="text-slate-500 text-sm max-w-xs">{text}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="shimmer h-4 rounded-lg w-3/4" />
      <div className="shimmer h-3 rounded-lg w-1/2" />
      <div className="shimmer h-3 rounded-lg w-1/4" />
    </div>
  );
}

function ConfidenceBar({ confidence }) {
  if (confidence === null || confidence === undefined) return null;
  const score = typeof confidence === 'object' ? confidence.score : confidence;
  const label = typeof confidence === 'object' ? confidence.label : (score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low');
  const reason = typeof confidence === 'object' ? confidence.reason : '';
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="shrink-0 mx-4 mt-3 rounded-xl px-4 py-3 flex items-center gap-4" style={{ background: 'rgba(79,157,255,0.06)', border: '1px solid rgba(79,157,255,0.15)' }}>
      <div className="flex items-center gap-2 shrink-0">
        <Shield size={13} style={{ color }} />
        <span className="text-xs text-slate-400">Research Confidence</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm font-bold" style={{ color }}>{score}/100</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>{label}</span>
      </div>
      {reason && <span className="text-xs text-slate-600 hidden lg:block truncate max-w-[160px]">{reason}</span>}
    </div>
  );
}

function StatsRow({ meta, papers, trials }) {
  const stats = [
    { label: 'Papers Fetched', value: meta?.totalFetched ?? papers.length, color: '#60a5fa' },
    { label: 'Top Papers', value: meta?.finalPapers ?? papers.length, color: '#a78bfa' },
    { label: 'Trials Found', value: meta?.totalTrials ?? trials.length, color: '#34d399' },
    { label: 'Top Trials', value: meta?.finalTrials ?? trials.length, color: '#fbbf24' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 shrink-0 px-4 mt-3">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="glass rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-white">{value ?? 0}</p>
          <p className="text-xs text-slate-500 leading-tight mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

function InsightsPanel({ insights, response }) {
  if (!insights && !response) return <EmptyState icon={Brain} text="Submit a medical query to see AI-generated clinical insights" />;

  return (
    <div className="space-y-3 fade-in">
      {/* Key Insights */}
      {insights?.keyInsights?.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(79,157,255,0.1), rgba(79,157,255,0.03))', border: '1px solid rgba(79,157,255,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Key Insights</span>
          </div>
          <div className="space-y-2">
            {insights.keyInsights.filter(Boolean).map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-400 text-xs mt-1 shrink-0">✔</span>
                <p className="text-sm text-slate-200 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Condition Overview */}
      {insights?.conditionOverview && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={13} className="text-blue-400" />
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Condition Overview</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{insights.conditionOverview}</p>
        </div>
      )}

      {/* Evidence Synthesis */}
      {insights?.evidenceSynthesis && (
        <div className="glass rounded-2xl p-4" style={{ borderLeft: '2px solid rgba(79,157,255,0.5)' }}>
          <div className="flex items-center gap-2 mb-2">
            <GitMerge size={13} className="text-blue-400" />
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Evidence Synthesis</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{insights.evidenceSynthesis}</p>
        </div>
      )}

      {/* Trials Connection */}
      {insights?.trialsConnection && (
        <div className="glass rounded-2xl p-4" style={{ borderLeft: '2px solid rgba(52,211,153,0.5)' }}>
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical size={13} className="text-green-400" />
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Trials Connection</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{insights.trialsConnection}</p>
        </div>
      )}

      {/* Critical Insight */}
      {insights?.criticalInsight && (
        <div className="glass rounded-2xl p-4" style={{ borderLeft: '2px solid rgba(251,191,36,0.5)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} className="text-yellow-400" />
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Critical Insight</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{insights.criticalInsight}</p>
        </div>
      )}

      {/* Fallback raw response */}
      {!insights && response && (
        <div className="glass rounded-2xl p-4" style={{ borderLeft: '2px solid rgba(79,157,255,0.5)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Brain size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">AI Analysis</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}

function SourcesPanel({ papers, trials }) {
  const all = [
    ...papers.filter(p => p.url).map(p => ({ title: p.title, url: p.url, type: p.source || 'PubMed', year: p.year })),
    ...trials.filter(t => t.url).map(t => ({ title: t.title, url: t.url, type: 'ClinicalTrials', year: '' })),
  ];
  if (!all.length) return <EmptyState icon={Link2} text="Sources will appear after a query" />;
  return (
    <div className="space-y-2 fade-in">
      {all.map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-3 glass glass-hover rounded-xl p-3 transition-all group">
          <span className="text-xs text-slate-600 mt-0.5 w-5 shrink-0 font-mono">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300 group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">{s.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-600">{s.type}</span>
              {s.year && <span className="text-xs text-slate-700">· {s.year}</span>}
            </div>
          </div>
          <Link2 size={12} className="text-slate-700 group-hover:text-blue-400 transition-colors shrink-0 mt-1" />
        </a>
      ))}
    </div>
  );
}

export default function ResultsPanel({ data = {}, isLoading, onTrendMode }) {
  const [activeTab, setActiveTab] = useState('insights');
  const papers = data?.papers || [];
  const trials = data?.trials || [];
  const meta = data?.meta || null;
  const response = data?.response || '';
  const insights = data?.insights || null;
  const confidence = data?.confidence ?? null;

  const hasResults = papers.length > 0 || trials.length > 0 || insights || response;

  useEffect(() => {
    if (hasResults && !isLoading) setActiveTab('insights');
  }, [hasResults, isLoading]);

  const tabCounts = {
    insights: (insights || response) ? '✓' : '',
    papers: papers.length || '',
    trials: trials.length || '',
    sources: (papers.filter(p => p.url).length + trials.filter(t => t.url).length) || '',
  };

  const handleExport = async () => {
    try {
      const { data: rep } = await generateReport({
        disease: meta?.disease || '',
        query: meta?.disease || '',
        answer: response,
        papers,
        trials,
        confidence: typeof confidence === 'object' ? confidence : { score: confidence, label: confidence >= 75 ? 'High' : 'Medium' }
      });
      const blob = new Blob([rep.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = rep.filename || 'curalink_report.txt'; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  return (
    <div className="flex flex-col h-full">

      {/* Confidence Bar */}
      {!isLoading && hasResults && <ConfidenceBar confidence={confidence} />}

      {/* Stats Row */}
      {!isLoading && hasResults && <StatsRow meta={meta} papers={papers} trials={trials} />}

      {/* Tabs + Export */}
      <div className="shrink-0 px-4 pt-3 pb-0 flex items-center gap-2">
        <div className="flex-1 flex gap-1 glass rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${activeTab === id ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
              <Icon size={11} />
              <span className="hidden sm:inline">{label}</span>
              {tabCounts[id] !== '' && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-700/80 text-slate-500'}`}>
                  {tabCounts[id]}
                </span>
              )}
            </button>
          ))}
          {onTrendMode && (
            <button onClick={onTrendMode}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium text-yellow-400 hover:bg-yellow-500/10 transition-all">
              <Zap size={11} /><span className="hidden sm:inline">Trends</span>
            </button>
          )}
        </div>

        {/* Export button */}
        {hasResults && (
          <button onClick={handleExport}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-blue-300 transition-colors glass glass-hover">
            <Download size={12} />
            <span className="hidden lg:inline">Export</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <div className="text-center py-3">
              <p className="text-xs text-blue-400/70 animate-pulse">🔍 Fetching PubMed + OpenAlex + ClinicalTrials...</p>
            </div>
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {activeTab === 'insights' && <InsightsPanel insights={insights} response={response} />}
            {activeTab === 'papers' && (papers.length > 0 ? papers.map((p, i) => <PaperCard key={i} paper={p} index={i} />) : <EmptyState icon={BookOpen} text="Research papers will appear here after a query" />)}
            {activeTab === 'trials' && (trials.length > 0 ? trials.map((t, i) => <TrialCard key={i} trial={t} />) : <EmptyState icon={FlaskConical} text="Clinical trials will appear here after a query" />)}
            {activeTab === 'sources' && <SourcesPanel papers={papers} trials={trials} />}
          </>
        )}
      </div>
    </div>
  );
}
