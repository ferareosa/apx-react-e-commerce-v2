-- 1. Preparación
create extension if not exists "pgcrypto";

-- 2. Tabla de pedidos base (si todavía no existe)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  status text not null check (
    status in (
      'pending-payment','paid','failed','packed','shipped','in-transit','delivered','cancelled'
    )
  ),
  currency text not null,
  total numeric(12,2) not null,
  payment_reference text,
  payment_provider text default 'mercadopago',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- 3. Tabla de eventos / tracking (una fila por hito logístico)
create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null check (status in ('pending-payment','paid','packed','shipped','in-transit','delivered','failed','cancelled')),
  note text,
  checkpoint jsonb not null default '{}'::jsonb, -- ej. { "carrier":"Andreani", "tracking_code":"XYZ123" }
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx on public.order_events (order_id, happened_at desc);

-- 4. Trigger para actualizar el status + updated_at de orders cada vez que ingresa un evento
create or replace function public.sync_order_status()
returns trigger as $$
begin
  update public.orders
     set status = new.status,
         updated_at = greatest(new.happened_at, now())
   where id = new.order_id;
  return new;
end;
$$ language plpgsql security definer
  set search_path = public;

drop trigger if exists order_events_sync on public.order_events;

create trigger order_events_sync
after insert on public.order_events
for each row execute function public.sync_order_status();

-- 5. Vistas para consumo rápido desde el frontend
create or replace view public.order_timeline as
select
  o.id as order_id,
  o.user_id,
  o.status current_status,
  o.total,
  o.currency,
  jsonb_build_object(
    'orderId', o.id,
    'productId', o.product_id,
    'status', o.status,
    'history',
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'status', e.status,
            'note', e.note,
            'checkpoint', e.checkpoint,
            'at', e.happened_at
          )
          order by e.happened_at desc
        )
        filter (where e.id is not null),
        '[]'::jsonb
      )
  ) as payload
from public.orders o
left join public.order_events e on e.order_id = o.id
group by o.id;

grant select on table public.order_timeline to service_role;

-- 6. Row Level Security (opcional)
alter table public.orders enable row level security;
alter table public.order_events enable row level security;

create policy "orders: owner can read" on public.orders
  for select using (auth.uid() = user_id);

create policy "orders: owner can insert" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "orders: service can manage"
  on public.orders
  for all
  to service_role
  using (true)
  with check (true);

create policy "order_events: owner can log" on public.order_events
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "order_events: owner can read" on public.order_events
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "order_events: service can manage"
  on public.order_events
  for all
  to service_role
  using (true)
  with check (true);

-- 7. Helper RPC para registrar checkpoints desde el backend
create or replace function public.log_order_event(
  p_order_id uuid,
  p_status text,
  p_note text default null,
  p_checkpoint jsonb default '{}'::jsonb,
  p_happened_at timestamptz default now()
) returns public.order_events
language sql
security definer
set search_path = public
as $$
  insert into public.order_events(order_id, status, note, checkpoint, happened_at)
  values (p_order_id, p_status, p_note, p_checkpoint, p_happened_at)
  returning *;
$$;
grant usage on schema public to service_role;
grant all on table public.orders to service_role;
grant all on table public.order_events to service_role;
grant all on sequence public.order_events_id_seq to service_role;