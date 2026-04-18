import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

function StreamText({ text }) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setShown(''); setDone(false);
    if (!text) return;
    let i = 0;
    const t = setInterval(() => { setShown(text.slice(0, i + 1)); i++; if (i >= text.length) { clearInterval(t); setDone(true); } }, 9);
    return () => clearInterval(t);
  }, [text]);
  return <span className={!done ? 'cursor' : ''}>{shown}</span>;
}

function ConfBar({ confidence }) {
  const score = typeof confidence === 'object' ? (confidence?.score || 0) : (confidence || 0);
  const label = typeof confidence === 'object' ? (confidence?.label || '') : (score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low');
  const reason = typeof confidence === 'object' ? confidence?.reason : '';
  const color = score >= 75 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-gray-600">Confidence Score</span>
          <p className="text-xs text-gray-400 mt-0.5">Based on clinical studies and research papers</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color }}>{score}/100</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>{label}</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-gray-100">
        <div className="conf-fill" style={{ '--w': `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function LoadingState() {
  const [step, setStep] = useState(0);
  const steps = ['Fetching PubMed papers…', 'Searching clinical trials…', 'Ranking evidence…', 'Generating insights…'];
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
        <svg className="w-6 h-6 text-blue-600 spin-slow" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div className="space-y-2 text-center">
        {steps.map((s, i) => (
          <p key={i} className="text-sm transition-all"
            style={{ color: i === step ? '#374151' : i < step ? '#D1D5DB' : '#E5E7EB' }}>
            {i < step ? <span className="text-green-500 mr-1">✓</span> : null}{s}
          </p>
        ))}
      </div>
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-12">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
        <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Clinical Research AI</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Get evidence-based insights from trusted medical sources — synthesized and ranked by AI.
        </p>
      </div>
      <div className="flex items-center gap-5">
        {['Real studies', 'Ranked evidence', 'No hallucination'].map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <span className="text-green-500 text-xs">✓</span>
            <span className="text-xs text-gray-400">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all">
      {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Section({ label, accent, children }) {
  return (
    <div className="fade-up">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm" style={{ borderLeft: accent ? `3px solid ${accent}` : undefined }}>
        {children}
      </div>
    </div>
  );
}

export default function CenterPanel({ data, isLoading }) {
  const { response, insights, papers = [], trials = [], confidence, meta } = data;
  const hasData = !!(response || insights);

  if (isLoading) return <LoadingState />;
  if (!hasData) return <EmptyHero />;

  const ki = insights?.keyInsights?.filter(Boolean) || [];
  const overview = insights?.conditionOverview || '';
  const synthesis = insights?.evidenceSynthesis || '';
  const trialsConn = insights?.trialsConnection || '';
  const critical = insights?.criticalInsight || '';
  const fullText = [overview, synthesis, trialsConn, critical, response].filter(Boolean).join('\n\n');

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {meta?.disease && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">
              {meta.disease}
            </span>
          )}
          {meta?.intent && <span className="text-xs text-gray-400">· {meta.intent}</span>}
        </div>
        <CopyBtn text={fullText} />
      </div>

      {/* Stats */}
      {meta && (
        <div className="grid grid-cols-4 gap-2 fade-up">
          {[
            { label: 'Fetched', val: meta.totalFetched ?? 0 },
            { label: 'Top Papers', val: meta.finalPapers ?? papers.length },
            { label: 'Trials', val: meta.finalTrials ?? trials.length },
            { label: 'Intent', val: meta.intent ?? '—' },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl p-3 text-center bg-white border border-gray-100 shadow-sm">
              <p className="text-base font-semibold text-gray-900">{val}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Confidence */}
      {confidence && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm fade-up">
          <ConfBar confidence={confidence} />
        </div>
      )}

      {/* Key Insights */}
      {ki.length > 0 && (
        <Section label="Key Insights" accent="#16A34A">
          <div className="space-y-2.5">
            {ki.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-green-500 text-xs mt-0.5 shrink-0">✓</span>
                <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {overview && (
        <Section label="Condition Overview">
          <p className="text-sm text-gray-700 leading-relaxed">{overview}</p>
        </Section>
      )}

      {synthesis && (
        <Section label="Evidence Synthesis" accent="#2563EB">
          <p className="text-sm text-gray-700 leading-relaxed">{synthesis}</p>
        </Section>
      )}

      {trialsConn && (
        <Section label="Clinical Trial Insights" accent="#16A34A">
          <p className="text-sm text-gray-700 leading-relaxed">{trialsConn}</p>
        </Section>
      )}

      {critical && (
        <Section label="Research Gap" accent="#DC2626">
          <p className="text-sm text-gray-700 leading-relaxed">{critical}</p>
        </Section>
      )}

      {!overview && !ki.length && response && (
        <Section label="AI Analysis">
          <p className="text-sm text-gray-700 leading-relaxed"><StreamText text={response} /></p>
        </Section>
      )}

      {/* Why this answer */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 fade-up">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Why this answer?</p>
        <div className="space-y-2">
          {[
            `${papers.length} peer-reviewed studies analyzed`,
            `${trials.length} clinical trials reviewed`,
            'Sources: PubMed · OpenAlex · ClinicalTrials.gov',
            'No hallucination — grounded in real evidence',
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-green-500 text-xs">✓</span>
              <span className="text-xs text-gray-500">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
