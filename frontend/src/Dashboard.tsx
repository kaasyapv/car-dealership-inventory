import { useEffect, useState } from 'react'
import * as api from './api'
import type { Filters, User, Vehicle, VehicleInput } from './types'
import VehicleCard from './VehicleCard'
import VehicleForm from './VehicleForm'

const NO_FILTERS: Filters = { make: '', model: '', category: '', minPrice: '', maxPrice: '' }
const filterField =
  'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

const replace = (list: Vehicle[], v: Vehicle) => list.map((x) => (x.id === v.id ? v : x))

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const isAdmin = user.role === 'admin'
  const [filters, setFilters] = useState(NO_FILTERS)
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)

  // ponytail: refetch on every keystroke, add a debounce if the catalogue gets big
  useEffect(() => {
    let stale = false // ignore responses that arrive after a newer search started
    api
      .searchVehicles(filters)
      .then((list) => !stale && (setVehicles(list), setError('')))
      .catch((e: Error) => !stale && setError(e.message))
    return () => {
      stale = true
    }
  }, [filters])

  /** Runs an API call, surfacing failures in the banner. */
  const attempt = async (work: () => Promise<void>) => {
    setError('')
    try {
      await work()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const update = (v: Vehicle) => setVehicles((list) => replace(list ?? [], v))
  const purchase = (v: Vehicle) => attempt(async () => update(await api.purchase(v.id)))
  const restock = (v: Vehicle) => attempt(async () => update(await api.restock(v.id, 5)))
  const remove = (v: Vehicle) =>
    window.confirm(`Delete ${v.make} ${v.model}?`) &&
    attempt(async () => {
      await api.deleteVehicle(v.id)
      setVehicles((list) => list?.filter((x) => x.id !== v.id) ?? [])
    })

  const save = async (input: VehicleInput) => {
    if (editing === 'new') {
      const created = await api.createVehicle(input)
      setVehicles((list) => [...(list ?? []), created])
    } else if (editing) {
      update(await api.updateVehicle(editing.id, input))
    }
    setEditing(null)
  }

  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters({ ...filters, [key]: e.target.value })
  const categories = [...new Set(vehicles?.map((v) => v.category))]

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
          <button onClick={() => setFilters(NO_FILTERS)} className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Clear
          </button>
          {isAdmin && (
            <button onClick={() => setEditing('new')} className="ml-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Add vehicle
            </button>
          )}
        </section>

        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-rose-700">{error}</p>}

        {vehicles?.length === 0 ? (
          <p className="mt-16 text-center text-slate-500">No vehicles match your search.</p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vehicles?.map((v) => (
              <VehicleCard key={v.id} vehicle={v} isAdmin={isAdmin} onPurchase={purchase} onRestock={restock} onEdit={setEditing} onDelete={remove} />
            ))}
          </div>
        )}
      </main>

      {editing && <VehicleForm vehicle={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} />}
    </div>
  )
}
