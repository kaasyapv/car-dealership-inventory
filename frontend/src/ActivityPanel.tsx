import { useEffect, useState } from 'react'
import * as api from './api'
import Modal from './Modal'
import type { StockEvent } from './types'

/** Admin view of the stock audit trail: who bought or restocked what, newest first. */
export default function ActivityPanel({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<StockEvent[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listEvents().then(setEvents).catch((e: Error) => setError(e.message))
  }, [])

  return (
    <Modal label="Recent activity" onClose={onClose}>
      <div className="p-7">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Recent activity</h2>
          <button autoFocus onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {events?.length === 0 && <p className="mt-4 text-slate-500">No sales or restocks yet.</p>}
        <ul className="mt-4 divide-y divide-slate-100">
          {events?.map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-3">
              <span aria-hidden className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${e.kind === 'purchase' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
              <div>
                <p className="text-sm text-slate-800">{`${e.userEmail} ${e.kind === 'purchase' ? 'bought' : 'restocked'} ${e.quantity} × ${e.vehicle}`}</p>
                <time dateTime={e.at} className="text-xs text-slate-400">{new Date(e.at).toLocaleString()}</time>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
