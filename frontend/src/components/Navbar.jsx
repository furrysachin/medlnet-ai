import { FlaskConical, ChevronDown } from 'lucide-react';

const INTENTS = ['general', 'treatment', 'prevention', 'diagnosis', 'research'];

export default function Navbar({ context, setContext, mode, setMode, status }) {
  const set = (k, v) => setContext(c => ({ ...c, [k]: v }));

  return (
    <header className="shrink-0 h-14 bg-white border-b border-gray-100 px-4 flex items-center justify-between gap-4">

      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <FlaskConical size={14} className="text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm">CuraLink</span>
      </div>

      {/* Context bar */}
      <div className="flex-1 flex items-center gap-2 max-w-2xl">

        {/* Disease */}
        <input
          value={context.disease}
          onChange={e => set('disease', e.target.value)}
          placeholder="Disease (e.g. Lung Cancer)"
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
        />

        {/* Intent */}
        <div className="relative shrink-0">
          <select
            value={context.intent}
            onChange={e => set('intent', e.target.value)}
            className="appearance-none text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 pr-8 outline-none focus:border-blue-400 transition-all cursor-pointer">
            {INTENTS.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Location */}
        <input
          value={context.location}
          onChange={e => set('location', e.target.value)}
          placeholder="Location (optional)"
          className="w-36 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
        />
      </div>

      {/* Mode + status */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mode toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
          {['research', 'simple'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#111827' : '#9CA3AF', boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {m === 'research' ? 'Research' : 'Simple'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-400">{status === 'online' ? 'Connected' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
