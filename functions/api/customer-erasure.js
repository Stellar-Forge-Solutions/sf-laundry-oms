// DPDP Right to Erasure API (Section 12 of India DPDP Act, 2023)
// Securely removes customer contact data from customer registry and anonymizes corresponding order/bill histories
import { admin, bearer, json, readJson, methodNotAllowed } from '../_shared/common.js'

export async function onRequestPost({ request, env }) {
  const sb = admin(env)
  const token = bearer(request)
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return json({ error: 'Not signed in' }, 401)

  const { data: shop } = await sb.from('shops').select('id, owner_id').eq('owner_id', user.id).maybeSingle()
  if (!shop) return json({ error: 'Only shop owners can process DPDP erasure requests' }, 403)

  const body = await readJson(request)
  const customerId = body.customer_id
  const phone = body.phone ? String(body.phone).trim() : null
  const email = body.email ? String(body.email).trim().toLowerCase() : null
  const reason = body.reason || 'Customer exercised DPDP erasure right'

  if (!customerId && !phone && !email) {
    return json({ error: 'Missing customer identifier (customer_id, phone, or email required)' }, 400)
  }

  // 1. Fetch target customer record if customerId is passed
  let targetCust = null
  if (customerId) {
    const { data } = await sb.from('order_customers').select('*').eq('id', customerId).eq('shop_id', shop.id).maybeSingle()
    targetCust = data
  }

  const matchPhone = phone || targetCust?.whatsapp || null
  const matchEmail = email || targetCust?.email || null

  let ordersAnonymized = 0
  let billsAnonymized = 0

  // 2. Anonymize Orders associated with this customer
  if (matchPhone || matchEmail || targetCust?.name) {
    let orderQuery = sb.from('orders').update({
      customer_name: 'Anonymized (DPDP Request)',
      customer_whatsapp: null,
      customer_email: null,
      notes: null,
    }).eq('shop_id', shop.id)

    if (matchPhone && matchEmail) {
      orderQuery = orderQuery.or(`customer_whatsapp.eq.${matchPhone},customer_email.eq.${matchEmail}`)
    } else if (matchPhone) {
      orderQuery = orderQuery.eq('customer_whatsapp', matchPhone)
    } else if (matchEmail) {
      orderQuery = orderQuery.eq('customer_email', matchEmail)
    } else if (targetCust?.name) {
      orderQuery = orderQuery.eq('customer_name', targetCust.name)
    }

    const { data: updatedOrders, error: ordErr } = await orderQuery.select('id')
    if (!ordErr && updatedOrders) {
      ordersAnonymized = updatedOrders.length
    }
  }

  // 3. Anonymize Bills associated with this customer
  if (targetCust?.name) {
    const { data: updatedBills } = await sb.from('bills')
      .update({ customer_name: 'Anonymized (DPDP Request)' })
      .eq('shop_id', shop.id)
      .eq('customer_name', targetCust.name)
      .select('id')
    if (updatedBills) billsAnonymized = updatedBills.length
  }

  // 4. Delete from order_customers table if record exists
  if (customerId) {
    await sb.from('order_customers').delete().eq('id', customerId).eq('shop_id', shop.id)
  } else if (matchPhone) {
    await sb.from('order_customers').delete().eq('shop_id', shop.id).eq('whatsapp', matchPhone)
  }

  // 5. Insert audit log entry in data_erasure_log for DPDP record-keeping
  try {
    await sb.from('data_erasure_log').insert({
      shop_id: shop.id,
      customer_id: customerId || null,
      customer_phone: matchPhone ? matchPhone.slice(-4).padStart(matchPhone.length, '*') : null, // Masked for privacy
      customer_email: matchEmail ? matchEmail.replace(/^.+@/, '***@') : null,
      requested_by: user.email || 'owner',
      orders_anonymized: ordersAnonymized,
      bills_anonymized: billsAnonymized,
      reason,
    })
  } catch (logErr) {
    console.warn('Could not write to data_erasure_log:', logErr.message)
  }

  return json({
    ok: true,
    message: 'Customer personal data successfully erased and transaction history anonymized in compliance with DPDP Act, 2023.',
    orders_anonymized: ordersAnonymized,
    bills_anonymized: billsAnonymized,
  })
}

export const onRequest = methodNotAllowed
