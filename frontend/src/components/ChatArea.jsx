import { useState, useRef, useEffect } from 'react';
import { Send, Plus, Stethoscope, BookOpen, Copy, Check } from 'lucide-react';

const DISEASES = ['Cancer', 'Diabetes', 'COVID-19', 'Alzheimer', 'Hypertension', 'Parkinson', 'Tuberculosis'];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="d1 w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      <span className="d2 w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      <span className="d3 w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
    </div>
  );
}

function StreamText({ text }) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setShown(''); setDone(false);
    if (!text) return;
    let i = 0;
    const t = setInterval(() => {
      setShown(text.slice(0, i + 1)); i++;
      if (i >= text.length) { clearInterval(t); setDone(true); }
    }, 8);
    return () => clearInterval(t);
  }, [text]);
  return <span className={!done ? 'cursor' : ''}>{shown}</span>;
}

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100">
      {c ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
      {c ? 'Copied' : 'Copy'}
    </button>
  );
}

function UserMessage({ msg }) {
  return (
    <div className="flex justify-end msg-in">
      <div className="max-w-lg">
        <div className="px-4 py-2.5 rounded-2xl rounded-br-md text-sm text-gray-900 leading-relaxed bg-gray-100">
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function AiMessage({ msg, isLatest }) {
  return (
    <div className="flex items-start gap-3 msg-in group">
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
        <Stethoscope size={13} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-gray-900">CuraLink</span>
          {msg.meta?.disease && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{msg.meta.disease}</span>
          )}
        </div>
        <div className="text-sm text-gray-700 leading-relaxed">
          {isLatest ? <StreamText text={msg.content} /> : msg.content}
        </div>
        {msg.meta && (
          <div className="flex items-center gap-3 mt-2">
            {msg.meta.finalPapers > 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <BookOpen size={10} /> {msg.meta.finalPapers} papers
              </span>
            )}
            {msg.meta.finalTrials > 0 && (
              <span className="text-xs text-gray-400">{msg.meta.finalTrials} trials</span>
            )}
          </div>
        )}
        <div className="mt-1">
          <CopyBtn text={msg.content} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSend, setDisease, disease }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <Stethoscope size={26} className="text-blue-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">How can I help you?</h1>
        <p className="text-sm text-gray-500 max-w-sm">Ask anything about clinical research, diseases, treatments, or medical trials.</p>
      </div>

      {/* Quick disease chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {DISEASES.map(d => (
          <button key={d} onClick={() => { setDisease(d); onSend(`Latest research on ${d}`, d); }}
            className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatArea({ messages, isLoading, onSend, disease, setDisease, status, onToggleEvidence, showEvidence }) {
  const [input, setInput] = useState('');
  const [showDiseaseDrop, setShowDiseaseDrop] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const submit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen">

      {/* Navbar */}
      <div className="shrink-0 h-12 flex items-center justify-between px-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {disease && (
            <span className="text-sm text-gray-500">
              Research: <span className="font-medium text-gray-900">{disease}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">{status === 'online' ? 'Connected' : 'Offline'}</span>
          </div>
          <button onClick={onToggleEvidence}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showEvidence ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
            <BookOpen size={12} /> Evidence
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isLoading
          ? <EmptyState onSend={onSend} setDisease={setDisease} disease={disease} />
          : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                msg.role === 'user'
                  ? <UserMessage key={msg.id} msg={msg} />
                  : <AiMessage key={msg.id} msg={msg} isLatest={i === messages.length - 1} />
              ))}
              {isLoading && (
                <div className="flex items-start gap-3 msg-in">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Stethoscope size={13} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 mb-1">CuraLink</p>
                    <TypingDots />
                    <p className="text-xs text-gray-400 mt-1">Analyzing clinical research…</p>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">

          {/* Disease context pill */}
          {disease && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400">Context:</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5">
                {disease}
                <button onClick={() => setDisease('')} className="text-blue-400 hover:text-blue-600">×</button>
              </span>
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">

            {/* Plus / disease picker */}
            <div className="relative">
              <button onClick={() => setShowDiseaseDrop(v => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <Plus size={16} />
              </button>
              {showDiseaseDrop && (
                <div className="absolute bottom-10 left-0 z-20 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 overflow-hidden">
                  <p className="text-xs text-gray-400 px-3 py-1.5">Select disease</p>
                  {DISEASES.map(d => (
                    <button key={d} onClick={() => { setDisease(d); setShowDiseaseDrop(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Ask anything about clinical research…"
              rows={1}
              disabled={isLoading}
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none resize-none max-h-32 leading-relaxed disabled:opacity-60"
              style={{ lineHeight: '1.5' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            />

            {/* Send */}
            <button onClick={submit} disabled={!input.trim() || isLoading}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: input.trim() && !isLoading ? '#2563EB' : '#E5E7EB' }}
              onMouseEnter={e => { if (input.trim() && !isLoading) e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <Send size={14} style={{ color: input.trim() && !isLoading ? '#fff' : '#9CA3AF' }} />
            </button>
          </div>

          <p className="text-center text-xs text-gray-300 mt-2">CuraLink may make mistakes. Always verify with medical sources.</p>
        </div>
      </div>
    </div>
  );
}
