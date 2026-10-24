import type { Vehicle } from './types'

type Props = {
  vehicle: Vehicle
  isAdmin: boolean
  busy: boolean
  onPurchase: (v: Vehicle) => void
  onRestock: (v: Vehicle) => void
  onEdit: (v: Vehicle) => void
  onDelete: (v: Vehicle) => void
}

const adminButton =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100'

// VEHICLE CARD: one car in the grid, with the Purchase button and the admin buttons
export default function VehicleCard({ vehicle, isAdmin, busy, onPurchase, onRestock, onEdit, onDelete }: Props) {
  const soldOut = vehicle.quantity === 0
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
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
          <p className="text-2xl font-extrabold text-indigo-600">{`$${vehicle.price.toLocaleString('en-US')}`}</p>
        </div>
        <p className={`text-sm font-medium ${soldOut ? 'text-rose-600' : 'text-emerald-600'}`}>
          {soldOut ? 'Sold out' : `${vehicle.quantity} in stock`}
        </p>

        {/* PURCHASE BUTTON: disabled when stock is 0 or a request is running */}
        <button
          disabled={soldOut || busy}
          onClick={() => onPurchase(vehicle)}
          className="mt-auto rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Purchase
        </button>

        {/* ADMIN BUTTONS: only rendered for admins */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button className={adminButton} onClick={() => onEdit(vehicle)}>Edit</button>
            <button className={adminButton} onClick={() => onRestock(vehicle)}>Restock +5</button>
            <button className={`${adminButton} text-rose-600`} onClick={() => onDelete(vehicle)}>Delete</button>
          </div>
        )}
      </div>
    </article>
  )
}
