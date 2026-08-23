import type { ReactNode } from 'react'

export function AdminConfirmDialog({ title, children, confirmLabel, cancelLabel, busy, onConfirm, onCancel }: { title: string; children: ReactNode; confirmLabel: string; cancelLabel: string; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}><section className="admin-confirm" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title"><span className="admin-confirm-icon">⚠️</span><h2 id="admin-confirm-title">{title}</h2><div>{children}</div><footer><button className="secondary-button" disabled={busy} onClick={onCancel}>{cancelLabel}</button><button className="primary-button" disabled={busy} onClick={onConfirm}>{busy ? '…' : confirmLabel}</button></footer></section></div>
}
