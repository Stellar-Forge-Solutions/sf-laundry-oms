-- COPY for reference. Apply this migration in the shared database owner repository as well.
-- Store the grand-total rounding adjustment separately so invoice components reconcile.
alter table orders add column if not exists round_off numeric(12,2) not null default 0;

grant insert (round_off) on orders to authenticated;
grant update (round_off) on orders to authenticated;
