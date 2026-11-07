import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useShop } from '../lib/ShopContext'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import PlanCard from '../components/PlanCard'
import { logoUrl } from '../lib/shop'
import { contactUrl, upgradeUrl } from '../lib/planHelper'
import { CORE_KEYS, DEFAULT_STAGES, normStages } from '../lib/orderUtils'

const SHOP_KEYS = ['name', 'tagline', 'address', 'mobile', 'whatsapp', 'gst_no', 'website', 'thank_you']
const FIELD_LABELS = [
  ['category', 'Category'],
  ['description', 'Description'],
  ['unit', 'Unit'],
  ['tax', 'Tax (GST)'],
  ['freight', 'Freight / delivery charges'],
  ['notes', 'Order notes'],
  ['speed_dial', '⚡ Speed dial / Quick items (one-tap entry for fast counter billing)'],
]

function resizeLogo(file, max = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      c.toBlob(b => b ? resolve(b) : reject(new Error('Bad image')), 'image/png')
    }; img.onerror = () => reject(new Error('Not an image')); img.src = URL.createObjectURL(file)
  })
}

export default function SettingsPage() {
  const { shop, settings, canWrite, isPro, plan, can, hasExpense, isOwner, isStaff, role, reload } = useShop()
  const { user } = useAuth()
  const toast = useToast()
  const maxExtraStages = can('customStages') ? 3 : 0 // Free/Basic keep 5 default stages (0 extra); Pro up to 8 (5 + 3 extra)
  const [sf, setSf] = useState(() => Object.fromEntries(SHOP_KEYS.map(k => [k, shop?.[k] ?? ''])))
  const [paper, setPaper] = useState(shop?.paper_width || 58)
  const [s, setS] = useState(() => ({
    category_label: settings.category_label, order_prefix: settings.order_prefix, notify_channel: settings.notify_channel, printer_mode: settings.printer_mode,
    fields: { ...settings.fields }, tax: JSON.parse(JSON.stringify(settings.tax)),
    custom_url: settings.custom_url || '', brand_color: settings.brand_color || '', hide_powered: !!settings.hide_powered,
    data_retention_months: settings.data_retention_months || 24,
    reset_order_no: !!settings.reset_order_no,
    max_order_no: settings.max_order_no || 1000,
  }))
  const [core, setCore] = useState(() => {
    const res = {}
    for (const k of CORE_KEYS) {
      const match = settings.stages.find(x => x.key === k)
      const defLabel = DEFAULT_STAGES.find(x => x.key === k)?.label || k
      res[k] = {
        label: match?.label || defLabel,
        enabled: match ? match.enabled !== false : true,
      }
    }
    return res
  })
  const [extras, setExtras] = useState(() => settings.stages.filter(x => !CORE_KEYS.includes(x.key)))
  const [busy, setBusy] = useState(false)

  // Staff management state
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' })
  const [staffErr, setStaffErr] = useState('')
  const [staffBusy, setStaffBusy] = useState(false)

  const loadStaff = async () => {
    if (!isOwner || !shop) return
    setStaffLoading(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        if (data.staff) { setStaffList(data.staff); setStaffLoading(false); return }
      }
      const { data } = await supabase.from('shop_staff').select('id, name, email, role, created_at').eq('shop_id', shop.id).order('created_at')
      setStaffList(data || [])
    } catch {
      try {
        const { data } = await supabase.from('shop_staff').select('id, name, email, role, created_at').eq('shop_id', shop.id).order('created_at')
        setStaffList(data || [])
      } catch {}
    } finally {
      setStaffLoading(false)
    }
  }

  useEffect(() => { loadStaff() }, [isOwner, shop?.id])

  const addStaff = async () => {
    setStaffErr('')
    if (!newStaff.name.trim()) return setStaffErr('Staff name is required')
    if (!newStaff.email.trim()) return setStaffErr('Staff email is required')
    if (newStaff.password.length < 6) return setStaffErr('Password must be at least 6 characters')
    setStaffBusy(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newStaff),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add staff')
      toast('Staff member added')
      setShowAddStaff(false)
      setNewStaff({ name: '', email: '', password: '' })
      loadStaff()
    } catch (e) {
      setStaffErr(e.message)
    } finally {
      setStaffBusy(false)
    }
  }

  const removeStaff = async (id, name) => {
    if (!confirm(`Remove staff access for “${name}”? They will no longer be able to log in.`)) return
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/staff?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove staff')
      toast('Staff removed')
      loadStaff()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const setShop = (k) => (e) => setSf({ ...sf, [k]: e.target.value })
  const inp = (label, k, props = {}) => <div className="form-group"><label className="form-label">{label}</label><input className="form-input" value={sf[k]} onChange={setShop(k)} {...props} /></div>
  const toggleField = (k) => setS({ ...s, fields: { ...s.fields, [k]: !s.fields[k] } })
  const setTax = (k, patch) => setS({ ...s, tax: { ...s.tax, [k]: { ...s.tax[k], ...patch } } })
  const logo = logoUrl(shop)

  const save = async () => {
    if (!sf.name.trim()) return toast('Shop name is required', 'error')
    const mobile = sf.mobile.replace(/\D/g, '').slice(-10)
    if (mobile.length !== 10) return toast('Enter a 10-digit mobile number', 'error')

    const activeCore = Object.entries(core).filter(([_, conf]) => conf.enabled)
    if (activeCore.length + extras.length < 2) {
      return toast('At least 2 order statuses must remain enabled', 'error')
    }

    const labels = [...activeCore.map(([_, conf]) => conf.label), ...extras.map(x => x.label)]
    if (labels.some(l => !l.trim() || l.trim().length > 30)) return toast('Every enabled status needs a name (up to 30 characters)', 'error')
    if (new Set(labels.map(l => l.trim().toLowerCase())).size !== labels.length) return toast('Status names must be different from each other', 'error')
    if (s.fields.tax && !['cgst', 'sgst', 'igst'].some(k => s.tax[k].on)) return toast('Tax is on: tick at least one tax (CGST, SGST or IGST)', 'error')
    for (const k of ['cgst', 'sgst', 'igst']) { const p = Number(s.tax[k].pct); if (s.tax[k].on && !(p >= 0 && p <= 100)) return toast(`${k.toUpperCase()} percent must be between 0 and 100`, 'error') }
    if (!/^[A-Za-z0-9-]{0,8}$/.test(s.order_prefix)) return toast('Order prefix: up to 8 letters, digits or -', 'error')
    if (s.reset_order_no) {
      const maxNo = Number(s.max_order_no)
      if (!maxNo || maxNo < 10 || maxNo > 1000000) return toast('Max order number before reset must be between 10 and 1,000,000', 'error')
    }
    if (s.custom_url && !/^https:\/\/[^\s]+$/i.test(s.custom_url.trim())) return toast('Custom URL must start with https://', 'error')
    setBusy(true)

    const stagePayload = [
      ...Object.entries(core).map(([key, conf]) => ({ key, label: conf.label.trim(), enabled: !!conf.enabled })),
      ...extras.map(x => ({ key: x.key, label: x.label.trim(), enabled: true })),
    ]
    const stages = normStages(stagePayload)

    // Migrate orders that were in now-disabled or deleted stages back to the first active stage
    const newlyDisabledKeys = Object.keys(core).filter(k => !core[k].enabled)
    const removedExtraKeys = settings.stages.filter(x => !CORE_KEYS.includes(x.key) && !stages.some(n => n.key === x.key)).map(x => x.key)
    const allRemovedKeys = [...new Set([...newlyDisabledKeys, ...removedExtraKeys])]

    const fallbackStageKey = stages[0]?.key || 'processing'
    for (const rk of allRemovedKeys) {
      await supabase.from('orders')
        .update({ stage_key: fallbackStageKey })
        .eq('stage_key', rk)
        .eq('shop_id', shop.id)
    }

    const clean = (v) => (typeof v === 'string' ? v.trim() || null : v)
    const shopRow = { ...Object.fromEntries(SHOP_KEYS.map(k => [k, clean(sf[k])])), name: sf.name.trim(), mobile, whatsapp: (sf.whatsapp || mobile).replace(/\D/g, '').slice(-10), thank_you: sf.thank_you.trim() || 'Thank you!', paper_width: Number(paper) }
    const e1 = (await supabase.from('shops').update(shopRow).eq('id', shop.id)).error
    const e2 = (await supabase.from('order_settings').upsert({
      shop_id: shop.id, stages, category_label: s.category_label.trim() || 'Category', notify_channel: s.notify_channel, fields: s.fields, tax: s.tax,
      printer_mode: s.printer_mode, order_prefix: s.order_prefix.trim().toUpperCase(),
      data_retention_months: Number(s.data_retention_months) || 24,
      reset_order_no: !!s.reset_order_no,
      max_order_no: Number(s.max_order_no) || 1000,
      ...(can('branding') ? { brand_color: s.brand_color.trim() || null, hide_powered: s.hide_powered } : {}),
      ...(can('customDomain') ? { custom_url: s.custom_url.trim() || null } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'shop_id' })).error
    setBusy(false)
    if (e1 || e2) return toast('Could not save: ' + (e1 || e2).message, 'error')
    toast('Settings saved'); reload()
  }

  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const blob = await resizeLogo(file)
      const cleanShopId = String(shop.id || '').replace(/[^a-zA-Z0-9\-]/g, '')
      const path = `${cleanShopId}/logo-${Date.now()}.png`
      const up = await supabase.storage.from('logos').upload(path, blob, { contentType: 'image/png' })
      const { error } = await supabase.from('shops').update({ logo_path: path }).eq('id', shop.id); if (error) throw error
      toast('Logo updated'); reload()
    } catch (x) { toast('Logo upload failed: ' + x.message, 'error') }
  }

  const toggleSync = async (on) => {
    const { error } = await supabase.rpc('set_orders_sales_sync', { p_on: on })
    if (error) return toast(error.message, 'error')
    toast(on ? 'Delivered orders now appear as sales in Expense Tracker' : 'Sales sync switched off'); reload()
  }
  const addExtra = () => setExtras([...extras, { key: 'x' + Date.now().toString(36), label: '' }])
  const H = ({ children, sub }) => <><h3 style={{ marginTop: 22, marginBottom: sub ? 2 : 10 }}>{children}</h3>{sub && <p className="text-muted" style={{ marginBottom: 10 }}>{sub}</p>}</>

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle" style={{ marginBottom: 16 }}>Changes apply to new orders and messages.</p>

      {isStaff && (
        <div className="hint-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534', borderStyle: 'solid', marginBottom: 16 }}>
          <b>👤 Staff Account</b>
          <div style={{ marginTop: 4, fontSize: '0.82rem' }}>You are logged in as a staff member for <b>{shop?.name}</b>. Shop profile, billing plans, and settings are managed by the shop owner ({shop?.owner_name || ''}).</div>
        </div>
      )}

      {isOwner && !can('staffLogins') && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <div>
              <div className="section-title">Staff Logins</div>
              <div className="text-muted" style={{ fontSize: '.78rem' }}>Multi-user role access for counter and order management</div>
            </div>
            <span className="badge badge-accent">PRO FEATURE</span>
          </div>
          <div className="empty-state" style={{ padding: '16px 12px' }}>
            <div className="empty-state-text" style={{ marginBottom: 12 }}>
              Staff logins are available on the Pro plan. Add your team members to take orders without sharing your owner password.
            </div>
            <a
              className="btn btn-dark btn-sm"
              href={contactUrl('Staff logins (Orders Pro)', shop, user)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              💬 Contact us on WhatsApp for Pro
            </a>
          </div>
        </div>
      )}

      {isOwner && can('staffLogins') && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <div>
              <div className="section-title">Staff Accounts</div>
              <div className="text-muted" style={{ fontSize: '.78rem' }}>1 Owner (You) + up to 2 Staff logins for taking orders</div>
            </div>
            <span className="badge" style={{ background: staffList.length >= 2 ? '#fee2e2' : 'var(--teal-glow)', color: staffList.length >= 2 ? '#991b1b' : 'var(--teal-dark)' }}>
              {staffList.length} / 2 Staff added
            </span>
          </div>

          {staffLoading && <div className="text-muted" style={{ fontSize: '.85rem' }}>Loading staff…</div>}

          {!staffLoading && !staffList.length && (
            <div className="empty-state" style={{ padding: '16px 12px' }}>
              <div className="empty-state-text">No staff accounts added yet. You can add up to 2 staff members.</div>
            </div>
          )}

          {staffList.map(st => (
            <div className="item-row" key={st.id}>
              <div>
                <b>{st.name}</b>
                <div className="text-muted" style={{ fontSize: '.78rem' }}>{st.email} · Staff login</div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)' }}
                onClick={() => removeStaff(st.id, st.name)}
              >
                Remove
              </button>
            </div>
          ))}

          <div style={{ marginTop: 14 }}>
            {staffList.length < 2 ? (
              <button className="btn btn-secondary btn-sm" onClick={() => { setStaffErr(''); setShowAddStaff(true) }}>
                + Add staff member
              </button>
            ) : (
              <div className="text-muted" style={{ fontSize: '.78rem' }}>
                Maximum staff limit reached (2 of 2 slots used). Remove a staff member to add another.
              </div>
            )}
          </div>
        </div>
      )}

      {isOwner && <PlanCard />}

      <div className="card">
        <H>Shop details</H>
        {inp('Shop name', 'name', { disabled: isStaff })}{inp('Second line (tagline)', 'tagline', { disabled: isStaff })}{inp('Address', 'address', { disabled: isStaff })}
        <div className="grid2">{inp('Mobile', 'mobile', { inputMode: 'numeric', disabled: isStaff })}{inp('WhatsApp', 'whatsapp', { inputMode: 'numeric', disabled: isStaff })}</div>
        <div className="grid2">{inp('GST number (optional)', 'gst_no', { disabled: isStaff })}{inp('Website (optional)', 'website', { disabled: isStaff })}</div>
        {inp('Thank-you text (bill and messages)', 'thank_you', { disabled: isStaff })}
        <div className="form-group"><label className="form-label">Logo (bill, tracking page, email)</label>
          {logo && <img src={logo} alt="" style={{ height: 60, display: 'block', marginBottom: 8 }} />}
          <input type="file" accept="image/*" onChange={upload} disabled={!canWrite || isStaff} /></div>

        <H sub={can('customStages') ? "Enable or disable statuses to suit your shop workflow. Rename or add up to 3 more stages (max 8 stages total)." : "Default order stages. Customizing, renaming and adding stages is a Pro feature."}>
          Order statuses {!can('customStages') && <span className="pro-tag">PRO</span>}
        </H>
        {[['received', 'Received (Intake)'], ['processing', 'Processing']].map(([k, desc]) => (
          <div className="form-group" key={k} style={{ opacity: core[k].enabled ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="toggle-row" style={{ margin: 0, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={core[k].enabled}
                  onChange={e => setCore({ ...core, [k]: { ...core[k], enabled: e.target.checked } })}
                  disabled={isStaff || !can('customStages')}
                />
                {desc}
              </label>
              {!core[k].enabled && <span className="text-muted" style={{ fontSize: '.75rem' }}>(Disabled)</span>}
            </div>
            <input
              className="form-input"
              maxLength={30}
              value={core[k].label}
              onChange={e => setCore({ ...core, [k]: { ...core[k], label: e.target.value } })}
              disabled={isStaff || !can('customStages') || !core[k].enabled}
            />
          </div>
        ))}
        {extras.map((x, i) => (
          <div className="form-group" key={x.key}><label className="form-label">Extra status {i + 1}</label>
            <div className="flex gap-2"><input className="form-input" maxLength={30} placeholder="e.g. Packing" value={x.label} onChange={e => setExtras(extras.map(y => y.key === x.key ? { ...y, label: e.target.value } : y))} disabled={isStaff || !can('customStages')} />
              {!isStaff && can('customStages') && <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => confirm('Remove this status? Orders in it move back to Processing.') && setExtras(extras.filter(y => y.key !== x.key))}>✕</button>}</div></div>))}
        {extras.length < maxExtraStages && !isStaff && can('customStages') && <button className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }} onClick={addExtra}>+ Add a status after Processing</button>}
        {!can('customStages') && (
          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Custom stages (rename, enable/disable, add up to 8 stages, reorder) is a Pro feature.{' '}
            <a href={contactUrl('Custom stages (Orders Pro)', shop, user)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal-dark)', fontWeight: 600 }}>
              Contact us on WhatsApp ↗
            </a>
          </div>
        )}
        {[['ready', 'Ready to Dispatch'], ['delivered', 'Delivered (Completed)'], ['returned', 'Returned']].map(([k, desc]) => (
          <div className="form-group" key={k} style={{ opacity: core[k].enabled ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="toggle-row" style={{ margin: 0, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={core[k].enabled}
                  onChange={e => setCore({ ...core, [k]: { ...core[k], enabled: e.target.checked } })}
                  disabled={isStaff || !can('customStages')}
                />
                {desc}
              </label>
              {!core[k].enabled && <span className="text-muted" style={{ fontSize: '.75rem' }}>(Disabled)</span>}
            </div>
            <input
              className="form-input"
              maxLength={30}
              value={core[k].label}
              onChange={e => setCore({ ...core, [k]: { ...core[k], label: e.target.value } })}
              disabled={isStaff || !can('customStages') || !core[k].enabled}
            />
          </div>
        ))}

        <H>Names</H>
        <div className="grid2">
          <div className="form-group"><label className="form-label">What do you call “Category”?</label><input className="form-input" maxLength={24} placeholder="Masala, Car Type…" value={s.category_label} onChange={e => setS({ ...s, category_label: e.target.value })} disabled={isStaff} /></div>
          <div className="form-group"><label className="form-label">Order number prefix</label><input className="form-input" maxLength={8} value={s.order_prefix} onChange={e => setS({ ...s, order_prefix: e.target.value })} disabled={isStaff} /></div>
        </div>

        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <label className="toggle-row" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={s.reset_order_no}
              onChange={e => setS({ ...s, reset_order_no: e.target.checked })}
              disabled={isStaff}
            />
            Reset order numbers cyclically (e.g. cycle back to 1 after reaching max limit)
          </label>
          {s.reset_order_no && (
            <div style={{ marginTop: 12, paddingLeft: 28 }}>
              <div className="form-group" style={{ marginBottom: 6 }}>
                <label className="form-label" style={{ fontSize: '.82rem' }}>Max order number before reset</label>
                <input
                  className="form-input"
                  type="number"
                  inputMode="numeric"
                  min="10"
                  max="1000000"
                  step="1"
                  placeholder="1000"
                  value={s.max_order_no}
                  onChange={e => setS({ ...s, max_order_no: e.target.value })}
                  disabled={isStaff}
                  style={{ maxWidth: 220 }}
                />
              </div>
              <div className="text-muted" style={{ fontSize: '.76rem' }}>
                Order numbering will format as {String(1).padStart(String(s.max_order_no || 1000).length, '0')} up to {s.max_order_no || 1000}, then cycle back to {String(1).padStart(String(s.max_order_no || 1000).length, '0')}.
              </div>
            </div>
          )}
        </div>

        <H sub="Untick what you do not need. They disappear from the new-order screen.">Fields on the new-order page</H>
        {FIELD_LABELS.map(([k, l]) => <label className="toggle-row" key={k}><input type="checkbox" checked={!!s.fields[k]} onChange={() => toggleField(k)} disabled={isStaff} />{k === 'category' ? s.category_label || l : l}</label>)}
        {s.fields.tax && <div className="hint-box mt-3" style={{ borderStyle: 'solid' }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Which taxes do you charge, and at what percent?</div>
          {['cgst', 'sgst', 'igst'].map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: 0 }}>
              <input type="checkbox" checked={s.tax[k].on} onChange={e => setTax(k, { on: e.target.checked })} disabled={isStaff} />
              <span style={{ width: 52, fontWeight: 600, color: 'var(--text)' }}>{k.toUpperCase()}</span>
              <input
                className="form-input"
                style={{ width: 100, minWidth: 80, padding: '8px 12px', fontSize: '1rem', textAlign: 'center' }}
                type="number" inputMode="decimal" min="0" max="100" step="any"
                disabled={!s.tax[k].on || isStaff}
                value={s.tax[k].pct}
                onChange={e => setTax(k, { pct: e.target.value })}
              />
              <span style={{ color: 'var(--muted)', fontWeight: 500 }}>%</span>
            </div>))}
          <div style={{ fontSize: '.75rem', marginTop: 6 }}>Prices are taken as tax-exclusive; tax is added on top. A product’s own % (from Excel) overrides these.</div>
        </div>}

        <H sub="After you change an order's status you get a pop-up to send the update.">Customer notification</H>
        <div className="seg">{[['whatsapp', 'WhatsApp'], ['email', 'Email'], ['both', 'Both']].map(([k, l]) => <button key={k} className={s.notify_channel === k ? 'on' : ''} onClick={() => !isStaff && setS({ ...s, notify_channel: k })} disabled={isStaff}>{l}</button>)}</div>

        <H sub="Choose how the Print buttons behave by default. Both options are always on the order page.">Printing</H>
        <div className="seg" style={{ marginBottom: 12 }}>{[['thermal', 'Thermal printer'], ['normal', 'Normal printer']].map(([k, l]) => <button key={k} className={s.printer_mode === k ? 'on' : ''} onClick={() => !isStaff && setS({ ...s, printer_mode: k })} disabled={isStaff}>{l}</button>)}</div>
        <div className="form-group"><label className="form-label">Thermal printer paper</label>
          <select className="form-input" value={paper} onChange={e => setPaper(e.target.value)} disabled={isStaff}><option value={58}>2 inch (58 mm)</option><option value={80}>3 inch (80 mm)</option></select></div>
        <Link to="/connect-printer" className="btn btn-secondary btn-sm">🖨️ How to connect a thermal printer</Link>

        {hasExpense && isOwner && <>
          <H sub="Each day, the amount collected from paid and partially paid orders is added to your Expense Tracker as one sale.">Expense Tracker</H>
          <label className="toggle-row"><input type="checkbox" checked={!!shop.sync_orders_sales} disabled={!canWrite} onChange={e => toggleSync(e.target.checked)} />Send paid orders to Expense Tracker as sales</label>
        </>}

        {isOwner && <>
          <H>Branding & Custom Domain{!can('branding') && <span className="pro-tag">PRO</span>}</H>
          <div className={can('branding') ? '' : 'lock'}>
            <div className="form-group">
              <label className="form-label">Custom URL for tracking links</label>
              <input
                className="form-input"
                placeholder="https://orders.yourshop.com"
                value={s.custom_url}
                onChange={e => setS({ ...s, custom_url: e.target.value })}
                disabled={!can('customDomain')}
              />
              <div className="text-muted" style={{ fontSize: '.72rem', marginTop: 4 }}>
                {can('customDomain') ? 'Admin-configured domain for your shop.' : 'Pro feature: Use your own shop domain for customer tracking links.'}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Brand colour (tracking page, email)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={s.brand_color || '#00c9a7'}
                  onChange={e => setS({ ...s, brand_color: e.target.value })}
                  disabled={!can('branding')}
                  style={{ width: 52, height: 44, border: '1.5px solid var(--border)', borderRadius: 8 }}
                />
                <input
                  className="form-input"
                  placeholder="#00c9a7"
                  value={s.brand_color}
                  onChange={e => setS({ ...s, brand_color: e.target.value })}
                  disabled={!can('branding')}
                />
              </div>
            </div>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={s.hide_powered}
                onChange={e => setS({ ...s, hide_powered: e.target.checked })}
                disabled={!can('branding')}
              />
              Hide “Powered by Stellar Forge” (White label)
            </label>
          </div>
          <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            {!can('branding') && (
              <a className="btn btn-dark btn-sm" target="_blank" rel="noopener noreferrer" href={contactUrl('Branding & Pro features', shop, user)}>
                💬 Contact us on WhatsApp for Pro
              </a>
            )}
            <a className="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer" href={contactUrl('Dedicated infrastructure (Orders Pro)', shop, user)}>
              🏗️ Dedicated infra: contact us
            </a>
          </div>

          <div className="card" style={{ marginTop: 24, border: '1px solid #cbd5e1' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 6px', fontWeight: 700 }}>Data Privacy & Compliance (DPDP Act, 2023)</h3>
            <p className="text-muted" style={{ fontSize: '.8rem', margin: '0 0 14px' }}>
              Compliant with India's Digital Personal Data Protection Act. Orders older than your retention period are anonymized to fulfill storage limitation principles.
            </p>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Personal Data Retention Period</label>
              <select
                className="form-input"
                value={s.data_retention_months}
                onChange={e => setS({ ...s, data_retention_months: Number(e.target.value) })}
                style={{ maxWidth: 300 }}
              >
                <option value={12}>1 Year (12 months)</option>
                <option value={24}>2 Years (24 months) — Recommended</option>
                <option value={36}>3 Years (36 months)</option>
                <option value={60}>5 Years (60 months — Maximum)</option>
              </select>
            </div>
            <div style={{ fontSize: '.78rem', color: '#64748b', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span>Grievance Cell: <b>workwithstellarforge@gmail.com</b></span>
              <span>&bull;</span>
              <Link to="/privacy" target="_blank" style={{ color: 'var(--teal)', textDecoration: 'underline' }}>
                View Privacy Notice
              </Link>
            </div>
          </div>
        </>}

        {!isStaff && (
          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 24 }} onClick={save} disabled={busy || !canWrite}>{busy ? 'Saving…' : 'Save settings'}</button>
        )}
      </div>

      {showAddStaff && (
        <div className="modal-overlay" onClick={() => setShowAddStaff(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Staff Member</div>
            <div className="modal-subtitle">Create a login for your counter staff or helper (Slot {staffList.length + 1} of 2).</div>

            <div className="form-group">
              <label className="form-label">Staff Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Rahul"
                value={newStaff.name}
                onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                className="form-input"
                type="email"
                placeholder="e.g. rahul@shop.com"
                value={newStaff.email}
                onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Set Password *</label>
              <input
                className="form-input"
                type="password"
                placeholder="At least 6 characters"
                value={newStaff.password}
                onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
              />
              <div className="text-muted" style={{ fontSize: '.72rem', marginTop: 4 }}>
                Your staff will use this email and password to log in.
              </div>
            </div>

            {staffErr && <div className="err-text">✕ {staffErr}</div>}

            <div className="flex gap-2 mt-3">
              <button className="btn btn-ghost" onClick={() => setShowAddStaff(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={staffBusy} onClick={addStaff}>
                {staffBusy ? 'Adding…' : 'Create Staff Login'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
