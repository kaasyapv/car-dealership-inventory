import { useCallback, useEffect, useState } from 'react'
import * as api from './api'
import ActivityPanel from './ActivityPanel'
import ConfirmDialog from './ConfirmDialog'
import { DEFAULT_FILTERS, filtersFromSearch, filtersToSearch, SORTS } from './filters'
import Toaster, { type Toast } from './Toaster'
import type { Filters, SortKey, User, Vehicle, VehicleInput } from './types'
import { useDebounced } from './useDebounced'
import VehicleCard from './VehicleCard'
import VehicleForm from './VehicleForm'

const SEARCH_DEBOUNCE_MS = 300
const TOAST_MS = 4000
const filterField =
  'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

const replace = (list: Vehicle[], v: Vehicle) => list.map((x) => (x.id === v.id ? v : x))

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const isAdmin = user.role === 'admin'
  const [filters, setFilters] = useState<Filters>(() => filtersFromSearch(window.location.search))
  const query = useDebounced(filters, SEARCH_DEBOUNCE_MS)

  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null) // null = first load in progress
  const [total, setTotal] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0) // bump to retry the current search
  const [busy, setBusy] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)
  const [showActivity, setShowActivity] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))
  const notify = (kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => dismiss(id), TOAST_MS)
  }

  // Keep the address bar shareable/refresh-proof without growing browser history on every keystroke.
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname + filtersToSearch(query))
  }, [query])

  useEffect(() => {
    let stale = false // ignore a response that arrives after a newer search started
    api
      .searchVehicles(query, 0)
      .then((page) => {
        if (stale) return
        setVehicles(page.items)
        setTotal(page.total)
        setLoadError('')
      })
      .catch((e: Error) => !stale && setLoadError(e.message))
    return () => {
      stale = true
    }
  }, [query, attempt])

  const loadMore = async () => {
    try {
      const page = await api.searchVehicles(query, vehicles?.length ?? 0)
      setVehicles((list) => [...(list ?? []), ...page.items])
      setTotal(page.total)
    } catch (e) {
      notify('error', (e as Error).message)
    }
  }

  /** Runs one vehicle action: marks it busy (no double submits), toasts the outcome. */
  const act = async (v: Vehicle, work: () => Promise<void>, done: string) => {
    setBusy((s) => new Set(s).add(v.id))
    try {
      await work()
      notify('success', done)
    } catch (e) {
      notify('error', (e as Error).message)
    } finally {
      setBusy((s) => {
        const next = new Set(s)
        next.delete(v.id)
        return next
      })
    }
  }

  const name = (v: Vehicle) => `${v.make} ${v.model}`
  const update = (v: Vehicle) => setVehicles((list) => replace(list ?? [], v))
  const purchase = (v: Vehicle) => act(v, async () => update(await api.purchase(v.id)), `Purchased ${name(v)}`)
  const restock = (v: Vehicle) => act(v, async () => update(await api.restock(v.id, 5)), `Restocked ${name(v)} (+5)`)
  const confirmDelete = (v: Vehicle) => {
    setDeleting(null)
    return act(
      v,
      async () => {
        await api.deleteVehicle(v.id)
        setVehicles((list) => list?.filter((x) => x.id !== v.id) ?? [])
        setTotal((n) => n - 1)
      },
      `Deleted ${name(v)}`,
    )
  }

  const save = async (input: VehicleInput) => {
    if (editing === 'new') {
      const created = await api.createVehicle(input)
      setVehicles((list) => [...(list ?? []), created])
      setTotal((n) => n + 1)
    } else if (editing) {
      update(await api.updateVehicle(editing.id, input))
    }
    notify('success', 'Saved')
    setEditing(null)
  }

  const set = (key: Exclude<keyof Filters, 'available' | 'sort'>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters({ ...filters, [key]: e.target.value })
  const categories = [...new Set(vehicles?.map((v) => v.category))]
  const closeEditor = useCallback(() => setEditing(null), [])

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-indigo-400">▲</span> Showroom
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-300 sm:inline">{user.email}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase">{user.role}</span>
            <button onClick={onLogout} className="rounded-lg bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20">
              Log out
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
          <p className="text-3xl font-extrabold sm:text-4xl">Find your next ride.</p>
          <p className="mt-1 text-slate-300">Live inventory, updated the moment a car is sold.</p>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-7xl px-4 pb-16 sm:px-6">
        <section aria-label="Search" className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
          <input aria-label="Filter by make" placeholder="Make" value={filters.make} onChange={set('make')} className={filterField} />
          <input aria-label="Filter by model" placeholder="Model" value={filters.model} onChange={set('model')} className={filterField} />
          <input aria-label="Filter by category" placeholder="Category" list="categories" value={filters.category} onChange={set('category')} className={filterField} />
          <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <input aria-label="Minimum price" placeholder="Min $" type="number" min="0" value={filters.minPrice} onChange={set('minPrice')} className={`${filterField} w-28`} />
          <input aria-label="Maximum price" placeholder="Max $" type="number" min="0" value={filters.maxPrice} onChange={set('maxPrice')} className={`${filterField} w-28`} />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={filters.available} onChange={(e) => setFilters({ ...filters, available: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
            In stock only
          </label>
          <select aria-label="Sort by" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value as SortKey })} className={filterField}>
            {Object.entries(SORTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Clear
          </button>
          {isAdmin && (
            <div className="ml-auto flex gap-2">
              <button onClick={() => setShowActivity(true)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Activity
              </button>
              <button onClick={() => setEditing('new')} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Add vehicle
              </button>
            </div>
          )}
        </section>

        {loadError && (
          <div role="alert" className="mt-4 flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-rose-700">
            <span>{loadError}</span>
            <button onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">Try again</button>
          </div>
        )}

        {vehicles === null ? (
          !loadError && (
            <div aria-label="Loading vehicles" aria-busy="true" className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
              ))}
            </div>
          )
        ) : vehicles.length === 0 ? (
          <p className="mt-16 text-center text-slate-500">No vehicles match your search.</p>
        ) : (
          <>
            <p aria-live="polite" className="mt-5 text-sm text-slate-500">{`Showing ${vehicles.length} of ${total} vehicles`}</p>
            <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {vehicles.map((v) => (
                <VehicleCard key={v.id} vehicle={v} isAdmin={isAdmin} busy={busy.has(v.id)} onPurchase={purchase} onRestock={restock} onEdit={setEditing} onDelete={setDeleting} />
              ))}
            </div>
            {vehicles.length < total && (
              <div className="mt-8 text-center">
                <button onClick={loadMore} className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-800 shadow ring-1 ring-slate-200 hover:bg-slate-50">
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {editing && <VehicleForm vehicle={editing === 'new' ? null : editing} onSave={save} onCancel={closeEditor} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${name(deleting)}?`}
          message="This removes it from the catalogue. Its sales history is kept."
          confirmLabel="Delete"
          onConfirm={() => confirmDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
      {showActivity && <ActivityPanel onClose={() => setShowActivity(false)} />}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
