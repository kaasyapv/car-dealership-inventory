import { useState } from 'react'
import type { Vehicle, VehicleInput } from './types'

interface Props {
  vehicle: Vehicle | null // null = adding a new vehicle
  onSave: (input: VehicleInput) => Promise<void>
  onCancel: () => void
}

const field = 'mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

/** Modal form used by admins to add or edit a vehicle. */
export default function VehicleForm({ vehicle, onSave, onCancel }: Props) {
  const [values, setValues] = useState({
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    category: vehicle?.category ?? '',
    price: vehicle?.price.toString() ?? '',
    quantity: vehicle?.quantity.toString() ?? '',
  })
  const [error, setError] = useState('')
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues({ ...values, [key]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await onSave({ ...values, price: Number(values.price), quantity: Number(values.quantity) })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div role="dialog" aria-label={vehicle ? 'Edit vehicle' : 'Add vehicle'} className="fixed inset-0 z-20 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-7 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{vehicle ? 'Edit vehicle' : 'Add a vehicle'}</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium text-slate-700">
            Make
            <input required value={values.make} onChange={set('make')} className={field} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Model
            <input required value={values.model} onChange={set('model')} className={field} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Category
          <input required value={values.category} onChange={set('category')} className={field} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium text-slate-700">
            Price
            <input required type="number" min="0" step="any" value={values.price} onChange={set('price')} className={field} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Quantity
            <input required type="number" min="0" step="1" value={values.quantity} onChange={set('quantity')} className={field} />
          </label>
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700">Save</button>
        </div>
      </form>
    </div>
  )
}
