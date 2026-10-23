export interface Toast {
  id: number
  kind: 'success' | 'error'
  message: string
}

/** Transient messages. Errors use role="alert" (announced immediately), successes role="status" (polite). */
export default function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
            t.kind === 'error' ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          <span>{t.message}</span>
          <button aria-label="Dismiss" onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
