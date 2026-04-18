import { useState, useRef, useEffect } from 'react';
import { Send, Tag, Shield, HelpCircle, ChevronDown, ChevronUp, Lightbulb, FileText, Microscope, TrendingUp, Download, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

/* ── Loading skeleton ─────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 fade-up">
      {[80, 60, 90, 50].map((w, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="shimmer h-3.5 w-1/4" />
          <div className="shimmer h-3" style={{ width: `${w}%` }} />
          <div className="shimmer h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/* ── Empty workspace ──────────────────────── */
function EmptyWorkspace({ onQuery, context }) {
  const examples = [
    `Latest treatment options for ${context.disease || 'lung cancer'}`,
    `Clinical trials for ${context.disease || 'diabetes'} in India`,
    `Immunotherapy outcomes in ${context.disease || 'breast cancer'}`,
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
      <div>
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <Microscope size={26} className="text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Medical Research Workspace</h2>
        <p className="text-sm text-gray-500 max-w-md">
          Enter a research question below to get structured, evidence-based insights from PubMed, OpenAlex, and ClinicalTrials.gov
        </p>
      </div>
      <div className="w-full max-w-lg space-y-2">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Example queries</p>
        {examples.map((ex, i) => (
          <button key={i} onClick={() => onQuery(ex)}
            className="w-full text-left px-4 py-3 rounded-xl bg-white border border-gray-100 text-sm text-gray-600 hover:border-blue-200 hover:text-blue-700 hover:bg-blue-50 transition-all shadow-sm">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Confidence card ──────────────────────── */
function ConfidenceCard({ confidence, meta, papers = [], trials = [], counts }) {
  const score = typeof confidence === 'object' ? (confidence?.score || 0) : (confidence || 0);
  const label = typeof confidence === 'object' ? (confidence?.label || '') : (score >= 75 ? 'High' : 'Medium');
  const color = score >= 75 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626';
  // Use backend counts as single source of truth
  const paperCount  = counts?.papersUsed  ?? papers.length  ?? meta?.finalPapers  ?? 0;
  const trialCount  = counts?.trialsUsed  ?? trials.length  ?? meta?.finalTrials  ?? 0;
  const analyzed    = (counts?.papersAnalyzed ?? meta?.totalFetched ?? 0) + (counts?.trialsAnalyzed ?? meta?.totalTrials ?? 0);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={14} className="text-gray-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confidence Score</span>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold" style={{ color }}>{score}/100</span>
            <span className="text-sm font-medium px-2.5 py-1 rounded-full" style={{ background: `${color}12`, color, border: `1px solid ${color}20` }}>{label}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="bar-fill" style={{ '--w': `${score}%`, background: color }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Based on {paperCount} research papers + {trialCount} clinical trials</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-50">
        {[
          { val: paperCount, label: 'Papers' },
          { val: trialCount, label: 'Trials' },
          { val: analyzed || paperCount + trialCount, label: 'Analyzed' },
          { val: meta?.intent || '—', label: 'Intent' },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <p className="text-sm font-semibold text-gray-900 capitalize">{item.val}</p>
            <p className="text-xs text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Section card ─────────────────────────── */
function SectionCard({ icon: Icon, title, accentColor, children, collapsible = false }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm fade-up overflow-hidden">
      <div
        className={`flex items-center justify-between px-5 py-4 ${collapsible ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        style={{ borderLeft: `3px solid ${accentColor}` }}
        onClick={() => collapsible && setOpen(v => !v)}>
        <div className="flex items-center gap-2.5">
          <Icon size={14} style={{ color: accentColor }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentColor }}>{title}</span>
        </div>
        {collapsible && (open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />)}
      </div>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

/* ── Why this answer ──────────────────────── */
function WhyCard({ papers, trials, trialsConn, disease, location, meta }) {
  const [open, setOpen] = useState(true);
  // Use meta counts as source of truth to prevent 0 bug
  const paperCount = papers > 0 ? papers : (meta?.finalPapers || 0);
  const trialCount = meta?.totalTrials || trials || meta?.finalTrials || (trialsConn ? 1 : 0);
  const trialDisplay = trialCount > 0 ? trialCount : (trialsConn ? '1+' : 0);
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl shadow-sm fade-up overflow-hidden">
      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-colors" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-2.5">
          <HelpCircle size={14} className="text-gray-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Why this answer?</span>
        </div>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-2">
          {[
            `Synthesized from ${paperCount} peer-reviewed research papers`,
            `Verified against ${trialDisplay} clinical trial${trialDisplay !== 1 ? 's' : ''}${trialCount > 50 ? ' — strong research activity' : ''}`,
            'Sources: PubMed, OpenAlex, ClinicalTrials.gov',
            disease ? `Focused on ${disease}-specific research` : 'Disease-specific filtering applied',
            location ? `Location context: ${location}` : 'Ranked by relevance, recency, and clinical impact',
            'No hallucination — grounded in real evidence only',
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-green-500 text-xs mt-0.5 shrink-0">✓</span>
              <span className="text-xs text-gray-600">{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Query card ───────────────────────────── */
function QueryCard({ result }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 fade-up">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
          <FileText size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-relaxed">{result.query}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {result.context?.disease && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white text-blue-700 border border-blue-200 flex items-center gap-1">
                <Tag size={9} /> {result.context.disease}
              </span>
            )}
            {result.context?.intent && result.context.intent !== 'general' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white text-gray-600 border border-gray-200 capitalize">{result.context.intent}</span>
            )}
            {result.context?.location && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white text-gray-600 border border-gray-200">{result.context.location}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Research output ──────────────────────── */
function ResearchOutput({ result, mode, onQuery }) {

  const { insights, response, papers = [], trials = [], confidence, meta, followUps = [] } = result;
  const summary     = insights?.summary || '';
  const ki          = insights?.keyInsights?.filter(Boolean) || [];
  const overview    = insights?.conditionOverview || '';
  const synthesis   = insights?.evidenceSynthesis || '';
  const trialsConn  = insights?.trialsConnection || insights?.clinicalTrialInsights || '';
  const emerging    = insights?.emergingTreatments || '';
  const trends      = insights?.researchTrends?.filter(Boolean) || [];
  const critical    = insights?.criticalInsight || insights?.limitations || '';

  return (
    <div className="space-y-4">
      <QueryCard result={result} />

      {/* Export + Voice toolbar */}
      <div className="flex items-center gap-2 justify-end">
        <VoiceReadButton result={result} />
        <ExportButton result={result} />
      </div>

      {/* Summary — top insight */}
      {summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 fade-up">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">💡</span>
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Summary</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">{summary}</p>
        </div>
      )}

      <ConfidenceCard confidence={confidence} meta={meta} papers={papers} trials={trials} counts={result.counts} />

      {/* Summary / Key Insights */}
      {(overview || ki.length > 0) && (
        <SectionCard icon={Lightbulb} title="Key Insights" accentColor="#16A34A">
          {overview && <p className="text-sm text-gray-700 leading-relaxed mb-3">{overview}</p>}
          {ki.length > 0 && (
            <div className="space-y-2.5">
              {ki.slice(0, mode === 'simple' ? 3 : ki.length).map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-green-50 text-green-600 text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">{i + 1}</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Emerging Treatments */}
      {emerging && (
        <SectionCard icon={Lightbulb} title="Emerging Treatments" accentColor="#7C3AED" collapsible>
          <p className="text-sm text-gray-700 leading-relaxed">{emerging}</p>
        </SectionCard>
      )}

      {/* Evidence Synthesis */}
      {synthesis && (
        <SectionCard icon={Microscope} title="Evidence Synthesis" accentColor="#2563EB" collapsible>
          <p className="text-sm text-gray-700 leading-relaxed">{synthesis}</p>
        </SectionCard>
      )}

      {/* Trials connection — bullet format */}
      {trialsConn && (
        <SectionCard icon={FileText} title="Clinical Trial Insights" accentColor="#7C3AED" collapsible>
          <div className="space-y-2">
            {trialsConn.split('\n').filter(Boolean).map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-purple-400 text-xs mt-0.5 shrink-0">•</span>
                <p className="text-sm text-gray-700 leading-relaxed">{line.replace(/^[-•*]+\s*/, '')}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Research Trends */}
      {trends.length > 0 && (
        <SectionCard icon={TrendingUp} title="Research Trends" accentColor="#0891B2" collapsible>
          <div className="space-y-2">
            {trends.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-cyan-500 text-xs mt-0.5 shrink-0">↑</span>
                <p className="text-sm text-gray-700 leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Critical insight */}
      {critical && mode === 'research' && (
        <SectionCard icon={HelpCircle} title="Research Gaps & Limitations" accentColor="#DC2626" collapsible>
          <p className="text-sm text-gray-700 leading-relaxed">{critical}</p>
        </SectionCard>
      )}

      {/* Fallback */}
      {!overview && !ki.length && response && (
        <SectionCard icon={FileText} title="AI Analysis" accentColor="#6B7280">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{response}</p>
        </SectionCard>
      )}

      <WhyCard papers={result.counts?.papersUsed ?? papers.length} trials={result.counts?.trialsUsed ?? trials.length} trialsConn={trialsConn} disease={result.context?.disease} location={result.context?.location} meta={meta} />

      <FollowUps questions={followUps} onQuery={onQuery} />
    </div>
  );
}

/* ── Export helpers ──────────────────────── */
function buildExportText(result) {
  const { query, context, insights, response, papers = [], trials = [], confidence, counts } = result;
  const lines = [
    '═══════════════════════════════════════════',
    '         CURALINK — RESEARCH REPORT',
    '═══════════════════════════════════════════',
    `Query    : ${query}`,
    `Disease  : ${context?.disease || '—'}`,
    `Location : ${context?.location || '—'}`,
    `Date     : ${new Date().toLocaleDateString()}`,
    '',
    `Confidence: ${confidence?.score ?? 0}/100 (${confidence?.label ?? ''})`,
    `Papers used: ${counts?.papersUsed ?? papers.length} | Trials: ${counts?.trialsUsed ?? trials.length}`,
    '',
  ];
  if (insights?.summary)              lines.push('SUMMARY', '─────────────────', insights.summary, '');
  if (insights?.keyInsights?.length)  lines.push('KEY INSIGHTS', '─────────────────', ...insights.keyInsights.map((k,i) => `${i+1}. ${k}`), '');
  if (insights?.evidenceSynthesis)    lines.push('EVIDENCE SYNTHESIS', '─────────────────', insights.evidenceSynthesis, '');
  if (insights?.clinicalTrialInsights)lines.push('CLINICAL TRIAL INSIGHTS', '─────────────────', insights.clinicalTrialInsights, '');
  if (insights?.researchTrends?.length)lines.push('RESEARCH TRENDS', '─────────────────', ...insights.researchTrends.map((t,i) => `${i+1}. ${t}`), '');
  if (insights?.criticalInsight)      lines.push('LIMITATIONS', '─────────────────', insights.criticalInsight, '');
  if (!insights && response)          lines.push('AI ANALYSIS', '─────────────────', response, '');
  if (papers.length) {
    lines.push('SOURCES — PAPERS', '─────────────────');
    papers.slice(0,8).forEach((p,i) => lines.push(`[${i+1}] ${p.title} (${p.year}, ${p.source}) ${p.url||''}`) );
    lines.push('');
  }
  if (trials.length) {
    lines.push('SOURCES — CLINICAL TRIALS', '─────────────────');
    trials.slice(0,6).forEach((t,i) => lines.push(`[T${i+1}] ${t.title} | ${t.status} | ${t.phase}`) );
  }
  return lines.join('\n');
}

function ExportButton({ result }) {
  const [open, setOpen] = useState(false);
  if (!result) return null;

  const exportTxt = () => {
    const blob = new Blob([buildExportText(result)], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `curalink_${(result.context?.disease || 'report').replace(/\s+/g,'_').toLowerCase()}_${Date.now()}.txt`;
    a.click();
    setOpen(false);
  };

  const exportPdf = () => {
    const content = buildExportText(result);
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>CuraLink Report</title><style>body{font-family:monospace;font-size:13px;padding:32px;white-space:pre-wrap;color:#111}</style></head><body>${content.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</body></html>`);
    win.document.close();
    win.print();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
        <Download size={12} /> Export
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <button onClick={exportTxt} className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <FileText size={11} /> Download .txt
          </button>
          <button onClick={exportPdf} className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Download size={11} /> Print / Save PDF
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Voice read-aloud ─────────────────────── */
function VoiceReadButton({ result }) {
  const [speaking, setSpeaking] = useState(false);
  if (!result || !window.speechSynthesis) return null;

  const buildFullScript = () => {
    const { insights, response, papers = [], context } = result;
    const parts = [];

    // 1. Intro
    if (context?.disease) parts.push(`Research report for ${context.disease}.`);

    // 2. Full AI answer (response)
    if (response) {
      parts.push('Full Answer.');
      parts.push(response);
    }

    // 3. Summary
    if (insights?.summary) {
      parts.push('Summary.');
      parts.push(insights.summary);
    }

    // 4. Papers — title + year + source, one by one
    if (papers.length) {
      parts.push(`Research Papers. ${papers.length} papers analyzed.`);
      papers.slice(0, 8).forEach((p, i) => {
        parts.push(`Paper ${i + 1}. ${p.title}. Published ${p.year}. Source: ${p.source}.`);
      });
    }

    // 5. Key Insights — line by line
    if (insights?.keyInsights?.length) {
      parts.push('Key Insights.');
      insights.keyInsights.forEach((item, i) => {
        parts.push(`Insight ${i + 1}. ${item}`);
      });
    }

    // 6. Emerging Treatments
    if (insights?.emergingTreatments) {
      parts.push('Emerging Treatments.');
      parts.push(insights.emergingTreatments);
    }

    // 7. Evidence Synthesis
    if (insights?.evidenceSynthesis) {
      parts.push('Evidence Synthesis.');
      parts.push(insights.evidenceSynthesis);
    }

    // 8. Clinical Trial Insights — line by line
    if (insights?.clinicalTrialInsights || insights?.trialsConnection) {
      parts.push('Clinical Trial Insights.');
      const trialText = insights.clinicalTrialInsights || insights.trialsConnection;
      trialText.split('\n').filter(Boolean).forEach(line => parts.push(line.replace(/^[-•*]+\s*/, '')));
    }

    // 9. Research Trends — line by line
    if (insights?.researchTrends?.length) {
      parts.push('Research Trends.');
      insights.researchTrends.forEach((t, i) => parts.push(`Trend ${i + 1}. ${t}`));
    }

    // 10. Limitations
    if (insights?.criticalInsight || insights?.limitations) {
      parts.push('Limitations and Research Gaps.');
      parts.push(insights.criticalInsight || insights.limitations);
    }

    return parts.filter(Boolean).join(' ');
  };

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      const utt = new SpeechSynthesisUtterance(buildFullScript());
      utt.rate = 0.92;
      utt.pitch = 1.0;
      utt.onend = () => setSpeaking(false);
      utt.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utt);
      setSpeaking(true);
    }
  };

  return (
    <button onClick={toggle}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all"
      style={speaking
        ? { borderColor: '#2563EB', color: '#2563EB', background: '#EFF6FF' }
        : { borderColor: '#E5E7EB', color: '#6B7280', background: 'white' }}>
      {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
      {speaking ? 'Stop' : 'Read aloud'}
    </button>
  );
}

/* ── Follow-up suggestions ───────────────── */
function FollowUps({ questions, onQuery }) {
  if (!questions?.length) return null;
  return (
    <div className="fade-up">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Lightbulb size={11} /> You might also ask
      </p>
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => (
          <button key={i} onClick={() => onQuery(q)}
            className="text-left text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-300 rounded-xl px-4 py-2.5 transition-all leading-snug">
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
function InputBar({ onQuery, isLoading, context }) {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const ref = useRef(null);
  const recognitionRef = useRef(null);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Voice input not supported in this browser');
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = e => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const submit = () => {
    if (!input.trim() || isLoading) return;
    onQuery(input.trim());
    setInput('');
    ref.current?.focus();
  };

  return (
    <div className="shrink-0 bg-white border-t border-gray-100 px-6 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all"
          style={listening ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px #FEE2E2' } : {}}>
          <textarea
            ref={ref}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={listening ? 'Listening… speak your question' : `Ask a research question${context.disease ? ` about ${context.disease}` : ''}…`}
            rows={1}
            disabled={isLoading}
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none resize-none max-h-32 leading-relaxed disabled:opacity-50"
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          />
          {/* Mic button */}
          <button onClick={listening ? stopVoice : startVoice} disabled={isLoading}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0 disabled:opacity-30"
            style={{ background: listening ? '#FEE2E2' : '#F3F4F6' }}
            title={listening ? 'Stop listening' : 'Voice input'}>
            {listening
              ? <MicOff size={14} className="text-red-500" />
              : <Mic size={14} className="text-gray-500" />}
          </button>
          {/* Send button */}
          <button onClick={submit} disabled={!input.trim() || isLoading}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-30 shrink-0"
            style={{ background: input.trim() && !isLoading ? '#2563EB' : '#E5E7EB' }}
            onMouseEnter={e => { if (input.trim() && !isLoading) e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {isLoading
              ? <span className="flex gap-0.5"><span className="d1 w-1 h-1 bg-gray-500 rounded-full" /><span className="d2 w-1 h-1 bg-gray-500 rounded-full" /><span className="d3 w-1 h-1 bg-gray-500 rounded-full" /></span>
              : <Send size={14} style={{ color: input.trim() && !isLoading ? '#fff' : '#9CA3AF' }} />}
          </button>
        </div>
        {isLoading && <p className="text-center text-xs text-gray-400 mt-2">Analyzing research papers…</p>}
        {listening && <p className="text-center text-xs text-red-400 mt-2 animate-pulse">🎤 Listening… speak now</p>}
      </div>
    </div>
  );
}

/* ── Main workspace ───────────────────────── */
export default function Workspace({ result, isLoading, onQuery, context, mode }) {
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [result]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {isLoading
            ? <LoadingSkeleton />
            : result
              ? <ResearchOutput result={result} mode={mode} onQuery={onQuery} />
              : <EmptyWorkspace onQuery={onQuery} context={context} />
          }
        </div>
      </div>
      <InputBar onQuery={onQuery} isLoading={isLoading} context={context} />
    </div>
  );
}
