import type { Vehicle } from './types'

interface Props {
  vehicle: Vehicle
  isAdmin: boolean
  /** A request for this vehicle is in flight: blocks double submits. */
  busy: boolean
  onPurchase: (v: Vehicle) => void
  onRestock: (v: Vehicle) => void
  onEdit: (v: Vehicle) => void
  onDelete: (v: Vehicle) => void
}

const LOW_STOCK = 5

export const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const adminBtn =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100'

export default function VehicleCard({ vehicle, isAdmin, busy, onPurchase, onRestock, onEdit, onDelete }: Props) {
  const soldOut = vehicle.quantity === 0
  const lowStock = vehicle.quantity <= LOW_STOCK
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative flex h-32 items-end bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-4">
        <span aria-hidden className="absolute right-3 top-0 text-8xl font-black text-white/15">
          {vehicle.make[0]}
        </span>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {vehicle.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{`${vehicle.make} ${vehicle.model}`}</h3>
          <p className="text-2xl font-extrabold text-indigo-600">{formatPrice(vehicle.price)}</p>
        </div>
        <p className={`text-sm font-medium ${soldOut ? 'text-rose-600' : lowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
          {soldOut ? 'Sold out' : lowStock ? `Only ${vehicle.quantity} left` : `${vehicle.quantity} in stock`}
        </p>
        <button
          disabled={soldOut || busy}
          onClick={() => onPurchase(vehicle)}
          className="mt-auto rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Purchase
        </button>
        {isAdmin && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button className={adminBtn} onClick={() => onEdit(vehicle)}>Edit</button>
            <button className={adminBtn} onClick={() => onRestock(vehicle)}>Restock +5</button>
            <button className={`${adminBtn} text-rose-600`} onClick={() => onDelete(vehicle)}>Delete</button>
          </div>
        )}
      </div>
    </article>
  )
}
