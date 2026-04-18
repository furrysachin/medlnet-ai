import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, FlaskConical, BookOpen, TrendingUp, AlertTriangle, Pill, Shield, HelpCircle, Zap, ChevronDown, ChevronUp, ExternalLink, Activity, Sparkles } from 'lucide-react';

// ── Typing Effect ─────────────────────────────
function TypedText({ text, speed = 10 }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text]);
  return <span>{displayed}</span>;
}

// ── Loading Steps ─────────────────────────────
function LoadingSteps() {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: '🧠', text: 'Understanding query intent...' },
    { icon: '📚', text: 'Fetching PubMed research papers...' },
    { icon: '🌐', text: 'Searching OpenAlex database...' },
    { icon: '🧪', text: 'Matching clinical trials...' },
    { icon: '🏆', text: 'Ranking by clinical evidence strength...' },
    { icon: '⚙️', text: 'Generating structured insights...' },
  ];
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-3 py-6 px-2">
      {steps.map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= step ? 1 : 0.15, x: 0 }}
          transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
          <span className="text-base">{s.icon}</span>
          <span className={`text-sm transition-colors ${i < step ? 'text-slate-500' : i === step ? 'text-blue-300' : 'text-slate-700'}`}>{s.text}</span>
          {i < step && <span className="text-green-400 text-xs ml-auto">✓</span>}
          {i === step && (
            <div className="flex gap-1 ml-auto">
              {[0,1,2].map(j => <span key={j} className={`typing-dot w-1.5 h-1.5 rounded-full bg-blue-400`} />)}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Confidence Bar ────────────────────────────
function ConfidenceBar({ confidence }) {
  const score = typeof confidence === 'object' ? confidence?.score : (confidence || 0);
  const label = typeof confidence === 'object' ? confidence?.label : (score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low');
  const reason = typeof confidence === 'object' ? confidence?.reason : '';
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 px-4 py-3 rounded-xl flex items-center gap-4"
      style={{ background: 'rgba(17,27,46,0.8)', border: `1px solid ${color}25` }}>
      <Shield size={14} style={{ color }} className="shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">Research Confidence</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color }}>{score}/100</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>{label}</span>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
            initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1.2, ease: 'easeOut' }} />
        </div>
        {reason && <p className="text-xs text-slate-600 mt-1 truncate">{reason}</p>}
      </div>
    </motion.div>
  );
}

// ── Evidence Badge ────────────────────────────
function EvidenceBadge({ papers, trials }) {
  const total = papers.length + trials.length;
  const level = total >= 10 ? 'HIGH' : total >= 5 ? 'MEDIUM' : 'LOW';
  const cfg = {
    HIGH:   { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', color: '#10B981' },
    MEDIUM: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#F59E0B' },
    LOW:    { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#EF4444' },
  }[level];
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Shield size={15} style={{ color: cfg.color }} />
      <div>
        <p className="text-xs text-slate-500">Evidence Strength</p>
        <p className="text-sm font-bold" style={{ color: cfg.color }}>
          {level} — {papers.length} papers · {trials.length} trials
        </p>
      </div>
    </motion.div>
  );
}

// ── Why This Answer ───────────────────────────
function WhyThisAnswer({ papers, trials, confidence }) {
  const [open, setOpen] = useState(false);
  const score = typeof confidence === 'object' ? confidence?.score : confidence;
  const reason = typeof confidence === 'object' ? confidence?.reason : '';
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(17,27,46,0.9)', border: '1px solid rgba(79,157,255,0.12)' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={13} className="text-blue-400" />
          <span className="text-sm font-semibold text-white">Why this answer?</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-slate-500" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="px-4 pb-4 space-y-2 overflow-hidden">
            {[
              `Based on ${papers.length} peer-reviewed studies`,
              `Includes ${trials.length} clinical trials`,
              'No unsupported assumptions made',
              'Sources: PubMed + OpenAlex + ClinicalTrials.gov',
              score ? `Confidence score: ${score}/100${reason ? ` (${reason})` : ''}` : null,
            ].filter(Boolean).map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }} className="flex items-center gap-2">
                <span className="text-green-400 text-xs">✔</span>
                <span className="text-xs text-slate-400">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section Block ─────────────────────────────
function Section({ icon: Icon, label, color, children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} style={{ color }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ── Clinical Answer Panel ─────────────────────
function ClinicalAnswerPanel({ response, insights, papers, trials, confidence, isLoading }) {
  if (isLoading) return (
    <div className="flex-1 overflow-y-auto px-5 py-4"><LoadingSteps /></div>
  );

  if (!response && !insights) return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center neon-border"
        style={{ background: 'rgba(37,99,235,0.1)' }}>
        <Brain size={28} className="text-blue-400" />
      </motion.div>
      <div>
        <p className="text-white font-semibold text-base mb-1">Clinical Research AI</p>
        <p className="text-slate-500 text-sm leading-relaxed">Enter a disease and query to get evidence-based medical intelligence</p>
      </div>
      <motion.p animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 3 }}
        className="text-xs text-slate-600 italic max-w-xs">
        "We don't generate answers. We generate medically grounded intelligence."
      </motion.p>
    </div>
  );

  const keyFindings = insights?.keyInsights || [];
  const overview = insights?.conditionOverview || '';
  const synthesis = insights?.evidenceSynthesis || '';
  const risks = insights?.criticalInsight || '';
  const treatments = insights?.trialsConnection || '';

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      <EvidenceBadge papers={papers} trials={trials} />

      {overview && (
        <Section icon={Brain} label="Condition Summary" color="#60a5fa" delay={0.05}>
          <p className="text-sm text-slate-300 leading-relaxed">{overview}</p>
        </Section>
      )}

      {keyFindings.length > 0 && (
        <Section icon={Sparkles} label="Key Findings" color="#fbbf24" delay={0.1}>
          <div className="space-y-2">
            {keyFindings.filter(Boolean).slice(0, 4).map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }} className="flex items-start gap-2">
                <span className="text-green-400 text-xs mt-1 shrink-0">✔</span>
                <p className="text-sm text-slate-300 leading-relaxed">{f}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {synthesis && (
        <Section icon={TrendingUp} label="Evidence Synthesis" color="#a78bfa" delay={0.15}>
          <p className="text-sm text-slate-300 leading-relaxed">{synthesis}</p>
        </Section>
      )}

      {risks && (
        <Section icon={AlertTriangle} label="Critical Insight" color="#f87171" delay={0.2}>
          <p className="text-sm text-slate-300 leading-relaxed">{risks}</p>
        </Section>
      )}

      {treatments && (
        <Section icon={Pill} label="Trials Connection" color="#34d399" delay={0.25}>
          <p className="text-sm text-slate-300 leading-relaxed">{treatments}</p>
        </Section>
      )}

      {!overview && !keyFindings.length && response && (
        <Section icon={Brain} label="Clinical Analysis" color="#60a5fa" delay={0.05}>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            <TypedText text={response} speed={8} />
          </p>
        </Section>
      )}

      <WhyThisAnswer papers={papers} trials={trials} confidence={confidence} />
    </div>
  );
}

// ── Paper Card ────────────────────────────────
function PaperItem({ paper, index }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card-hover rounded-xl p-3 glow-blue"
      style={{ background: 'rgba(17,27,46,0.9)', border: '1px solid rgba(79,157,255,0.1)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug line-clamp-2">{paper.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }}>
              {paper.source || 'PubMed'}
            </span>
            {paper.year && <span className="text-xs text-slate-600">{paper.year}</span>}
            {paper._isIndian && <span className="text-xs">🇮🇳</span>}
            {paper.country && !paper._isIndian && <span className="text-xs text-slate-600">{paper.country}</span>}
          </div>
        </div>
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 text-slate-700 hover:text-blue-400 transition-colors mt-0.5">
            <ExternalLink size={13} />
          </a>
        )}
      </div>
      {paper.abstract && paper.abstract !== 'No abstract available' && (
        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">{paper.abstract}</p>
      )}
    </motion.div>
  );
}

// ── Trial Card ────────────────────────────────
function TrialItem({ trial, index }) {
  const isRecruiting = trial.status === 'RECRUITING';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card-hover rounded-xl p-3 glow-green"
      style={{ background: 'rgba(17,27,46,0.9)', border: '1px solid rgba(79,157,255,0.1)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug line-clamp-2">{trial.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: isRecruiting ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.15)', color: isRecruiting ? '#10B981' : '#94a3b8', border: `1px solid ${isRecruiting ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.2)'}` }}>
              {trial.status || 'Unknown'}
            </span>
            {trial.phase && trial.phase !== 'N/A' && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                {trial.phase}
              </span>
            )}
          </div>
        </div>
        {trial.url && (
          <a href={trial.url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 text-slate-700 hover:text-green-400 transition-colors mt-0.5">
            <ExternalLink size={13} />
          </a>
        )}
      </div>
      {trial.description && (
        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">{trial.description}</p>
      )}
    </motion.div>
  );
}

// ── Evidence Panel ────────────────────────────
function EvidencePanel({ papers, trials, trends, onTrendMode }) {
  const [tab, setTab] = useState('papers');
  const tabs = [
    { id: 'papers', label: 'Papers', count: papers.length, icon: BookOpen },
    { id: 'trials', label: 'Trials', count: trials.length, icon: FlaskConical },
  ];

  // Auto-show trends inline if available
  const topTrends = trends?.topTrends || [];

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 pt-3 pb-0">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(17,27,46,0.8)', border: '1px solid rgba(79,157,255,0.08)' }}>
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${tab === id ? 'text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}
              style={tab === id ? { background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)' } : {}}>
              <Icon size={11} /> {label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: tab === id ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.06)', color: tab === id ? '#93c5fd' : '#64748b' }}>
                  {count}
                </span>
              )}
            </button>
          ))}
          {onTrendMode && (
            <motion.button onClick={onTrendMode} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium text-yellow-400 hover:bg-yellow-500/10 transition-all">
              <Zap size={11} /> Trends
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <AnimatePresence mode="wait">
          {tab === 'papers' && (
            <motion.div key="papers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {papers.length > 0 ? papers.slice(0, 6).map((p, i) => <PaperItem key={i} paper={p} index={i} />) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <BookOpen size={28} className="text-slate-700 mb-3" />
                  <p className="text-slate-600 text-sm">Research papers will appear here</p>
                </div>
              )}
            </motion.div>
          )}
          {tab === 'trials' && (
            <motion.div key="trials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {trials.length > 0 ? trials.slice(0, 5).map((t, i) => <TrialItem key={i} trial={t} index={i} />) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <FlaskConical size={28} className="text-slate-700 mb-3" />
                  <p className="text-slate-600 text-sm">Clinical trials will appear here</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────
export default function ClinicalDashboard({ data = {}, isLoading, onTrendMode }) {
  const papers = data?.papers || [];
  const trials = data?.trials || [];
  const response = data?.response || '';
  const insights = data?.insights || null;
  const confidence = data?.confidence ?? null;
  const trends = data?.trends || null;
  const meta = data?.meta || null;

  const hasData = papers.length > 0 || trials.length > 0 || response;

  return (
    <div className="flex h-full overflow-hidden">

      {/* LEFT: Clinical Answer */}
      <div className="w-[46%] flex flex-col border-r border-blue-900/20 overflow-hidden">
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-blue-900/20">
          <div className="flex items-center gap-2">
            <motion.div animate={{ rotate: isLoading ? 360 : 0 }} transition={{ repeat: isLoading ? Infinity : 0, duration: 2, ease: 'linear' }}>
              <Brain size={15} className="text-blue-400" />
            </motion.div>
            <h2 className="text-sm font-bold text-white">🧠 Clinical Answer</h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">AI-grounded medical intelligence</p>
        </div>

        {hasData && !isLoading && <ConfidenceBar confidence={confidence} />}

        <ClinicalAnswerPanel
          response={response} insights={insights}
          papers={papers} trials={trials}
          confidence={confidence} isLoading={isLoading}
        />
      </div>

      {/* RIGHT: Evidence */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-blue-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-blue-400" />
              <h2 className="text-sm font-bold text-white">📄 Evidence</h2>
            </div>
            {hasData && (
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span>{papers.length} papers</span>
                <span>·</span>
                <span>{trials.length} trials</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">PubMed · OpenAlex · ClinicalTrials.gov</p>
        </div>

        {isLoading ? (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(17,27,46,0.8)' }}>
                <div className="shimmer h-4 w-3/4" />
                <div className="shimmer h-3 w-1/2" />
                <div className="shimmer h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <EvidencePanel papers={papers} trials={trials} trends={trends} onTrendMode={onTrendMode} />
        )}
      </div>
    </div>
  );
}
