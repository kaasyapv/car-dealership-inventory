import Modal from './Modal'

interface Props {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** In-app replacement for window.confirm; focus starts on the safe choice (Cancel). */
export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal label={title} role="alertdialog" onClose={onCancel}>
      <div className="space-y-2 p-7">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-slate-600">{message}</p>
        <div className="flex justify-end gap-3 pt-4">
          <button autoFocus onClick={onCancel} className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-xl bg-rose-600 px-5 py-2 font-semibold text-white hover:bg-rose-700">
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
