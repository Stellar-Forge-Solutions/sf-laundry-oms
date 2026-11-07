-- 0017_dpdp_compliance.sql
-- Digital Personal Data Protection (DPDP) Act, 2023 Compliance Migration
-- Adds erasure audit trail, retention settings, and cleanup function

-- 1. Table to record data erasure requests (Data Principal Right to Erasure)
create table if not exists public.data_erasure_log (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid,
  customer_phone text,
  customer_email text,
  requested_by text not null default 'owner',
  orders_anonymized integer default 0,
  bills_anonymized integer default 0,
  reason text default 'Customer exercised DPDP erasure right',
  created_at timestamptz not null default now()
);

-- RLS: Only shop owner/staff can view or insert erasure logs for their own shop
alter table public.data_erasure_log enable row level security;

create policy "erasure_log_select" on public.data_erasure_log
  for select using (shop_id = current_shop_id());

create policy "erasure_log_insert" on public.data_erasure_log
  for insert with check (shop_id = current_shop_id());

-- 2. Add retention settings column to order_settings if not present
alter table public.order_settings
  add column if not exists data_retention_months integer not null default 24;

-- 3. Automated Data Cleanup / Anonymization function (2-year retention policy)
create or replace function public.cleanup_expired_data(retention_months integer default 24)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cutoff_date timestamptz;
  expired_otp_count integer := 0;
  anonymized_orders_count integer := 0;
  jwt_role text;
begin
  -- Defence in depth: this is a global maintenance routine, never callable by API clients.
  jwt_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role'
  );
  if jwt_role is not null and jwt_role <> 'service_role' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Reject values that would yield a cutoff in the present/future and anonymize live data.
  if retention_months is null or retention_months < 1 then
    raise exception 'retention_months must be a positive integer' using errcode = '22023';
  end if;

  cutoff_date := now() - (retention_months || ' months')::interval;

  -- A. Clean up expired / used password reset OTP tokens older than 24 hours
  delete from public.password_reset_tokens
  where created_at < (now() - interval '24 hours')
     or (used = true and created_at < (now() - interval '1 hour'));
  get diagnostics expired_otp_count = row_count;

  -- B. Anonymize personal details in completed/cancelled orders past retention threshold
  update public.orders
  set customer_name = 'Anonymized (DPDP Retention)',
      customer_whatsapp = null,
      customer_email = null,
      notes = null
  where created_at < cutoff_date
    and customer_name != 'Anonymized (DPDP Retention)';
  get diagnostics anonymized_orders_count = row_count;

  return json_build_object(
    'success', true,
    'expired_otps_deleted', expired_otp_count,
    'orders_anonymized', anonymized_orders_count,
    'cutoff_date', cutoff_date
  );
end;
$$;

-- Restrict execution to the privileged backend (service_role / scheduler running as the owner).
revoke execute on function public.cleanup_expired_data(integer) from public, anon, authenticated;
grant execute on function public.cleanup_expired_data(integer) to service_role;
