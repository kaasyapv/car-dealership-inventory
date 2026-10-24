import { useEffect, useState } from 'react'
import * as api from './api'
import type { Filters, User, Vehicle, VehicleInput } from './types'
import VehicleCard from './VehicleCard'
import VehicleForm from './VehicleForm'

const emptyFilters: Filters = { make: '', model: '', category: '', minPrice: '', maxPrice: '', available: false }
const inputStyle =
  'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

type Message = { text: string; isError: boolean }

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const isAdmin = user.role === 'admin'
  const [filters, setFilters] = useState(emptyFilters)
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [message, setMessage] = useState<Message | null>(null)

  // LOAD VEHICLES: asks the backend for the cars that match the given filters
  const load = async (f: Filters) => {
    try {
      setVehicles(await api.searchVehicles(f))
      setLoadError('')
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }
  useEffect(() => {
    load(emptyFilters)
  }, [])

  const showMessage = (text: string, isError = false) => {
    setMessage({ text, isError })
    setTimeout(() => setMessage(null), 4000)
  }

  // RUN ACTION: runs a purchase/restock/delete, shows the result, then reloads the list
  const runAction = async (v: Vehicle, action: () => Promise<unknown>, success: string) => {
    setBusyId(v.id)
    try {
      await action()
      showMessage(success)
      await load(filters)
    } catch (e) {
      showMessage((e as Error).message, true)
    } finally {
      setBusyId(null)
    }
  }

  const name = (v: Vehicle) => `${v.make} ${v.model}`
  const purchase = (v: Vehicle) => runAction(v, () => api.purchase(v.id), `Purchased ${name(v)}`)
  const restock = (v: Vehicle) => runAction(v, () => api.restock(v.id, 5), `Restocked ${name(v)} (+5)`)
  const remove = (v: Vehicle) => {
    if (window.confirm(`Delete ${name(v)}?`)) runAction(v, () => api.deleteVehicle(v.id), `Deleted ${name(v)}`)
  }

  // SAVE FORM: creates a new vehicle or updates the one being edited
  const save = async (input: VehicleInput) => {
    if (editing === 'new') await api.createVehicle(input)
    else if (editing) await api.updateVehicle(editing.id, input)
    setEditing(null)
    showMessage('Saved')
    await load(filters)
  }

  const setField = (key: keyof Omit<Filters, 'available'>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters({ ...filters, [key]: e.target.value })

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER: title, who is logged in, log out */}
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
        {/* SEARCH BAR: make, model, category, price range, in stock only */}
        <form
          aria-label="Search"
          onSubmit={(e) => {
            e.preventDefault()
            load(filters)
          }}
          className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
        >
          <input aria-label="Filter by make" placeholder="Make" value={filters.make} onChange={setField('make')} className={inputStyle} />
          <input aria-label="Filter by model" placeholder="Model" value={filters.model} onChange={setField('model')} className={inputStyle} />
          <input aria-label="Filter by category" placeholder="Category" value={filters.category} onChange={setField('category')} className={inputStyle} />
          <input aria-label="Minimum price" placeholder="Min $" type="number" min="0" value={filters.minPrice} onChange={setField('minPrice')} className={`${inputStyle} w-28`} />
          <input aria-label="Maximum price" placeholder="Max $" type="number" min="0" value={filters.maxPrice} onChange={setField('maxPrice')} className={`${inputStyle} w-28`} />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={filters.available} onChange={(e) => setFilters({ ...filters, available: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
            In stock only
          </label>
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">Search</button>
          <button
            type="button"
            onClick={() => {
              setFilters(emptyFilters)
              load(emptyFilters)
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Clear
          </button>
          {/* ADD VEHICLE BUTTON (admin) */}
          {isAdmin && (
            <button type="button" onClick={() => setEditing('new')} className="ml-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Add vehicle
            </button>
          )}
        </form>

        {loadError && (
          <div role="alert" className="mt-4 flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-rose-700">
            <span>{loadError}</span>
            <button onClick={() => load(filters)} className="font-semibold underline">Try again</button>
          </div>
        )}

        {/* VEHICLE GRID: one card per car */}
        {vehicles === null ? (
          !loadError && <p className="mt-16 text-center text-slate-500">Loading vehicles…</p>
        ) : vehicles.length === 0 ? (
          <p className="mt-16 text-center text-slate-500">No vehicles match your search.</p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} isAdmin={isAdmin} busy={busyId === v.id} onPurchase={purchase} onRestock={restock} onEdit={setEditing} onDelete={remove} />
            ))}
          </div>
        )}
      </main>

      {editing && <VehicleForm vehicle={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} />}

      {/* MESSAGE BAR: success or error text at the bottom of the screen */}
      {message && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <p role={message.isError ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${message.isError ? 'bg-rose-600' : 'bg-slate-900'}`}>
            {message.text}
          </p>
        </div>
      )}
    </div>
  )
}
