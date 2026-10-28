import { useState } from 'react'

export default function PaymentStatusModal({ open, onClose, onConfirm, total }) {
  const [status, setStatus] = useState('unpaid')
  const [amount, setAmount] = useState('')

  if (!open) return null

  const isPartial = status === 'partial'
  const canConfirm =
    status !== 'partial' ||
    (amount && Number(amount) > 0 && Number(amount) < Number(total))

  const handleOk = () => {
    const amt = isPartial ? Number(amount) : null
    onConfirm(status, amt)
    // reset state for next open
    setStatus('unpaid')
    setAmount('')
  }

  const handleClose = () => {
    setStatus('unpaid')
    setAmount('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">💳 Confirm payment status</div>
        <div className="modal-subtitle">
          Select the payment status before moving the order to Delivered.
        </div>

        <div className="flex flex-col" style={{ gap: 12, marginTop: 8 }}>
          {[
            { value: 'unpaid',  label: 'Unpaid' },
            { value: 'partial', label: 'Partial payment' },
            { value: 'paid',    label: 'Paid in full' },
          ].map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                fontWeight: status === opt.value ? 600 : 400,
                fontSize: '0.95rem',
              }}
            >
              <input
                type="radio"
                name="payment_status"
                value={opt.value}
                checked={status === opt.value}
                onChange={() => { setStatus(opt.value); setAmount('') }}
                style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
              />
              {opt.label}
            </label>
          ))}

          {isPartial && (
            <input
              type="number"
              min="1"
              inputMode="decimal"
              placeholder="Amount received (₹)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="form-input"
              style={{ marginTop: 4 }}
              autoFocus
            />
          )}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <button
            className="btn btn-primary btn-full btn-lg"
            disabled={!canConfirm}
            onClick={handleOk}
          >
            Confirm &amp; Move to Delivered →
          </button>
          <button className="btn btn-ghost btn-full" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
