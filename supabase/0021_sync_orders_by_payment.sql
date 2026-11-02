-- ==============================================================================
-- Migration: 0021_sync_orders_by_payment.sql
-- Description: Sync sales to Expense Tracker based on payment status/amount paid
--              rather than order delivery status.
-- ==============================================================================

-- 1. Add paid_at timestamp column to orders if it doesn't exist
alter table orders add column if not exists paid_at timestamptz;
create index if not exists orders_shop_paid on orders (shop_id, paid_at) where paid_at is not null;

-- 2. Update orders_before trigger function to support cyclic reset AND maintain paid_at timestamp
create or replace function public.orders_before() returns trigger language plpgsql as $$
declare
  v_reset boolean := false;
  v_max integer := 1000;
  v_last_no integer := 0;
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext('order_no:' || new.shop_id::text));

    -- Fetch cyclic reset settings for this shop
    select coalesce(reset_order_no, false), coalesce(max_order_no, 1000)
      into v_reset, v_max
      from public.order_settings
     where shop_id = new.shop_id;

    -- Fetch the most recent order_no for this shop
    select order_no
      into v_last_no
      from public.orders
     where shop_id = new.shop_id
     order by created_at desc, id desc
     limit 1;

    if v_reset is true and coalesce(v_last_no, 0) >= v_max then
      new.order_no := 1;
    else
      new.order_no := coalesce(v_last_no, 0) + 1;
    end if;

    new.delivered_at := case when new.stage_key = 'delivered' then now() end;
    new.paid_at := case when new.payment_status in ('paid', 'partial') and coalesce(new.amount_paid, 0) > 0 then now() else null end;
  else
    new.order_no := old.order_no;
    new.token := old.token;
    new.shop_id := old.shop_id;
    new.delivered_at := case when new.stage_key = 'delivered' then coalesce(old.delivered_at, now()) else null end;

    -- Maintain paid_at timestamp
    if new.payment_status in ('paid', 'partial') and coalesce(new.amount_paid, 0) > 0 then
      -- If newly paid/partially paid, or payment changed from 0, update paid_at
      if old.paid_at is null or old.payment_status is distinct from new.payment_status or old.amount_paid is distinct from new.amount_paid then
        new.paid_at := now();
      else
        new.paid_at := old.paid_at;
      end if;
    else
      new.paid_at := null;
    end if;
  end if;
  return new;
end $$;

-- 3. Replace sync_orders_sales function to calculate total from paid orders on paid_at date
create or replace function sync_orders_sales(p_shop uuid, p_day date) returns void language plpgsql security definer set search_path = public as $$
declare v_total numeric(12,2); v_count int;
begin
  if p_day is null then return; end if;
  if not exists (select 1 from shops where id = p_shop and sync_orders_sales) or not shop_can_write(p_shop, 'expenses') then return; end if;
  perform pg_advisory_xact_lock(hashtext('orders_sales:' || p_shop::text || p_day::text));

  -- Sum collected money (amount_paid) for orders paid on p_day
  select coalesce(sum(amount_paid), 0), count(*) into v_total, v_count from orders
    where shop_id = p_shop
      and payment_status in ('paid', 'partial')
      and coalesce(amount_paid, 0) > 0
      and (paid_at at time zone 'Asia/Kolkata')::date = p_day;

  if v_count = 0 or v_total = 0 then
    delete from transactions where shop_id = p_shop and source = 'orders' and txn_date = p_day;
  else
    insert into transactions (shop_id, type, amount, category, description, txn_date, source, created_by)
    values (
      p_shop,
      'sale',
      v_total,
      'Orders',
      v_count || case when v_count = 1 then ' paid order' else ' paid orders' end || ' from orders app',
      p_day,
      'orders',
      'orders-app'
    )
    on conflict (shop_id, txn_date) where source = 'orders'
    do update set amount = excluded.amount, description = excluded.description;
  end if;
end $$;

-- 4. Update trigger function to sync on paid_at or amount_paid changes
create or replace function trg_orders_sync_sales() returns trigger language plpgsql security definer set search_path = public as $$
declare v_old date; v_new date;
begin
  if tg_op in ('UPDATE','DELETE') and old.paid_at is not null then
    v_old := (old.paid_at at time zone 'Asia/Kolkata')::date;
    perform sync_orders_sales(old.shop_id, v_old);
  end if;
  if tg_op in ('INSERT','UPDATE') and new.paid_at is not null then
    v_new := (new.paid_at at time zone 'Asia/Kolkata')::date;
    if v_new is distinct from v_old then
      perform sync_orders_sales(new.shop_id, v_new);
    elsif tg_op = 'UPDATE' and (old.amount_paid is distinct from new.amount_paid or old.payment_status is distinct from new.payment_status) then
      perform sync_orders_sales(new.shop_id, v_new);
    end if;
  end if;
  return null;
end $$;

-- 5. Update set_orders_sales_sync toggle to backfill based on paid_at
create or replace function set_orders_sales_sync(p_on boolean) returns void language plpgsql security definer set search_path = public as $$
declare v_shop uuid := current_shop_id(); d date;
begin
  if v_shop is null then raise exception 'no shop'; end if;
  if p_on then
    if not shop_can_write(v_shop, 'expenses') then raise exception 'Expense Tracker is not active'; end if;
    if not exists (select 1 from entitlements where shop_id = v_shop and product = 'orders') then raise exception 'Orders is not enabled for this shop'; end if;
    update shops set sync_orders_sales = true where id = v_shop;
    for d in
      select distinct (paid_at at time zone 'Asia/Kolkata')::date
      from orders
      where shop_id = v_shop
        and payment_status in ('paid', 'partial')
        and coalesce(amount_paid, 0) > 0
        and paid_at is not null
    loop
      perform sync_orders_sales(v_shop, d);
    end loop;
  else
    update shops set sync_orders_sales = false where id = v_shop;
    delete from transactions where shop_id = v_shop and source = 'orders';
  end if;
end $$;

-- 6. Backfill existing paid orders paid_at column if null (using delivered_at, updated_at or created_at)
update orders
set paid_at = coalesce(delivered_at, updated_at, created_at)
where payment_status in ('paid', 'partial')
  and coalesce(amount_paid, 0) > 0
  and paid_at is null;

-- 7. Ensure execution permissions are restricted to service_role / internal
revoke execute on function sync_orders_sales(uuid, date), trg_orders_sync_sales() from public, anon, authenticated;
grant execute on function set_orders_sales_sync(boolean) to authenticated;
