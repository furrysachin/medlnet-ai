import { Plus, Clock, BookOpen } from 'lucide-react';

export default function Sidebar({ sessions, activeSession, onSelect, onNew }) {
  return (
    <div className="w-56 shrink-0 h-full flex flex-col border-r border-gray-100 bg-gray-50 overflow-hidden">

      {/* New Research */}
      <div className="p-3">
        <button onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <Plus size={15} className="text-blue-600" />
          New Research
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {sessions.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Clock size={11} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">History</span>
            </div>
            {sessions.map(s => (
              <button key={s.id} onClick={() => onSelect(s.id)}
                className="w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-all"
                style={{ background: activeSession === s.id ? '#EFF6FF' : 'transparent', border: activeSession === s.id ? '1px solid #BFDBFE' : '1px solid transparent' }}
                onMouseEnter={e => { if (activeSession !== s.id) e.currentTarget.style.background = '#F3F4F6'; }}
                onMouseLeave={e => { if (activeSession !== s.id) e.currentTarget.style.background = 'transparent'; }}>
                <p className="text-xs font-medium truncate" style={{ color: activeSession === s.id ? '#1D4ED8' : '#374151' }}>
                  {s.query.slice(0, 36)}{s.query.length > 36 ? '…' : ''}
                </p>
                {s.context.disease && (
                  <p className="text-xs mt-0.5" style={{ color: activeSession === s.id ? '#3B82F6' : '#9CA3AF' }}>{s.context.disease}</p>
                )}
              </button>
            ))}
          </>
        )}

        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BookOpen size={20} className="text-gray-200 mb-2" />
            <p className="text-xs text-gray-300">No research yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
