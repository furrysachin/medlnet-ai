import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, BookOpen, TrendingUp } from 'lucide-react';

export default function PaperCard({ paper, index }) {
  const [expanded, setExpanded] = useState(false);

  const sourceColor = paper.source === 'PubMed' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  const displaySource = paper.source === 'PubMed' ? 'PubMed' : null;

  return (
    <div className="glass glass-hover rounded-2xl p-4 transition-all duration-200 fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs text-blue-400 font-semibold shrink-0 mt-0.5">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white leading-snug line-clamp-2">{paper.title}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {paper.authors && (
                <span className="text-xs text-slate-400 truncate max-w-[180px]">
                  {Array.isArray(paper.authors)
                    ? paper.authors.slice(0, 2).join(', ') + (paper.authors.length > 2 ? ' et al.' : '')
                    : String(paper.authors).slice(0, 60)}
                </span>
              )}
              {paper.year && <span className="text-xs text-slate-500">· {paper.year}</span>}
              {paper.citationCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-yellow-400/70">
                  <TrendingUp size={10} /> {paper.citationCount}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {paper.country && (
            <span className="text-xs px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
              {paper.country}
            </span>
          )}
          {!paper.country && paper._isIndian && (
            <span className="text-xs px-2 py-0.5 rounded-full border text-orange-400 bg-orange-500/10 border-orange-500/20">
              🇮🇳 India
            </span>
          )}
          {displaySource && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${sourceColor}`}>{displaySource}</span>
          )}
          {paper.url && (
            <a href={paper.url} target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg glass flex items-center justify-center hover:border-blue-500/40 transition-colors">
              <ExternalLink size={12} className="text-slate-400" />
            </a>
          )}
        </div>
      </div>

      {paper.abstract && (
        <>
          <button onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1.5 text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
            <BookOpen size={11} />
            {expanded ? 'Hide abstract' : 'View abstract'}
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-slate-400 leading-relaxed border-t border-blue-900/30 pt-3 fade-in">
              {paper.abstract}
            </p>
          )}
        </>
      )}
    </div>
  );
}
