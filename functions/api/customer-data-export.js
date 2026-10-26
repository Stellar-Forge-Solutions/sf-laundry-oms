// DPDP Right to Access / Information API (Section 11 of India DPDP Act, 2023)
// Provides a complete structured JSON summary of all digital personal data held for a customer
import { admin, bearer, json, readJson, methodNotAllowed } from '../_shared/common.js'

export async function onRequestPost({ request, env }) {
  const sb = admin(env)
  const token = bearer(request)
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return json({ error: 'Not signed in' }, 401)

  const { data: shop } = await sb.from('shops').select('id, name').eq('owner_id', user.id).maybeSingle()
  if (!shop) return json({ error: 'Only shop owners can export customer personal data' }, 403)

  const body = await readJson(request)
  const customerId = body.customer_id
  if (!customerId) return json({ error: 'Missing customer_id' }, 400)

  // 1. Fetch customer profile
  const { data: customer, error: cErr } = await sb
    .from('order_customers')
    .select('*')
    .eq('id', customerId)
    .eq('shop_id', shop.id)
    .maybeSingle()

  if (cErr || !customer) return json({ error: 'Customer not found' }, 404)

  // 2. Fetch associated orders
  let orderQuery = sb.from('orders')
    .select('order_no, created_at, stage_key, payment_status, total, amount_paid, delivery_date')
    .eq('shop_id', shop.id)

  if (customer.whatsapp && customer.email) {
    orderQuery = orderQuery.or(`customer_whatsapp.eq.${customer.whatsapp},customer_email.eq.${customer.email}`)
  } else if (customer.whatsapp) {
    orderQuery = orderQuery.eq('customer_whatsapp', customer.whatsapp)
  } else {
    orderQuery = orderQuery.eq('customer_name', customer.name)
  }

  const { data: orders } = await orderQuery.order('created_at', { ascending: false })

  // 3. Construct DPDP Structured Export
  const exportData = {
    dpdp_compliance_notice: 'Extract produced pursuant to Section 11 (Right to Information) of the Digital Personal Data Protection Act, 2023 (India)',
    fiduciary_name: shop.name,
    exported_at: new Date().toISOString(),
    customer_profile: {
      id: customer.id,
      name: customer.name,
      whatsapp: customer.whatsapp || null,
      email: customer.email || null,
      address: customer.address || null,
      registered_since: customer.created_at,
    },
    transaction_records_count: (orders || []).length,
    orders: orders || [],
    subprocessors_processing_data: [
      { name: 'Supabase', purpose: 'Encrypted storage & database hosting' },
      { name: 'Brevo', purpose: 'Transactional notification emails' },
      { name: 'Cloudflare', purpose: 'Secure web hosting & network security' },
    ],
  }

  return json({ ok: true, data: exportData })
}

export const onRequest = methodNotAllowed
