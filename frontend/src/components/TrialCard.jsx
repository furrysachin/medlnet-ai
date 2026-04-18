import { useState } from 'react';
import { ExternalLink, MapPin, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';

const statusConfig = {
  'Recruiting': 'text-green-400 bg-green-500/10 border-green-500/30',
  'Completed': 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  'Active, not recruiting': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'Not yet recruiting': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Terminated': 'text-red-400 bg-red-500/10 border-red-500/20',
};

export default function TrialCard({ trial }) {
  const [expanded, setExpanded] = useState(false);
  const statusClass = statusConfig[trial.status] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';

  return (
    <div className="glass glass-hover rounded-2xl p-4 transition-all duration-200 fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <FlaskConical size={13} className="text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white leading-snug line-clamp-2">{trial.title}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusClass}`}>{trial.status || 'Unknown'}</span>
              {trial.phase && <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">{trial.phase}</span>}
            </div>
          </div>
        </div>
        {trial.url && (
          <a href={trial.url} target="_blank" rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg glass flex items-center justify-center hover:border-blue-500/40 transition-colors shrink-0">
            <ExternalLink size={12} className="text-slate-400" />
          </a>
        )}
      </div>

      {trial.location && (
        <div className="flex items-center gap-1.5 mt-2 ml-10">
          <MapPin size={11} className="text-slate-500" />
          <span className="text-xs text-slate-500 truncate">{trial.location}</span>
        </div>
      )}

      {trial.eligibility && (
        <>
          <button onClick={() => setExpanded(!expanded)}
            className="mt-3 ml-10 flex items-center gap-1.5 text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
            {expanded ? 'Hide eligibility' : 'View eligibility'}
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-slate-400 leading-relaxed border-t border-blue-900/30 pt-3 fade-in">
              {trial.eligibility}
            </p>
          )}
        </>
      )}
    </div>
  );
}
