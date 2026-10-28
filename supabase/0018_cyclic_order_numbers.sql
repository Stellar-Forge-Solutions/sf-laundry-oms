-- 0018_cyclic_order_numbers.sql
-- Cyclic order number reset feature (e.g. 1 to 1000, then reset back to 1)

-- 1. Add reset columns to order_settings
alter table public.order_settings
  add column if not exists reset_order_no boolean not null default false,
  add column if not exists max_order_no integer not null default 1000 check (max_order_no >= 10 and max_order_no <= 1000000);

-- 2. Update orders_before trigger function to support cyclic reset
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
  else
    new.order_no := old.order_no;
    new.token := old.token;
    new.shop_id := old.shop_id;
    new.delivered_at := case when new.stage_key = 'delivered' then coalesce(old.delivered_at, now()) end;
  end if;
  return new;
end $$;
