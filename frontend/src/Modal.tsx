import { useEffect } from 'react'

interface Props {
  label: string
  role?: 'dialog' | 'alertdialog'
  onClose: () => void
  children: React.ReactNode
}

/** Accessible modal shell: labelled, closes on Escape or backdrop click. Callers set initial focus with autoFocus. */
export default function Modal({ label, role = 'dialog', onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role={role} aria-modal="true" aria-label={label} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {children}
      </div>
    </div>
  )
}
