-- Toss 결제 주문/결과 저장 테이블
-- 목적: 결제 성공 시 profiles 엔타이틀먼트(구독/애드온)를 안전하게 반영

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'toss',
  plan text not null, -- base | store_addon
  order_id text not null unique,
  amount integer not null,
  status text not null default 'ready', -- ready | paid | failed | cancelled
  payment_key text null,
  approved_at timestamptz null,
  raw jsonb null
);

create index if not exists payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc);

alter table public.payment_orders enable row level security;

drop policy if exists "payment_orders_select_own" on public.payment_orders;
create policy "payment_orders_select_own"
on public.payment_orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "payment_orders_insert_own" on public.payment_orders;
create policy "payment_orders_insert_own"
on public.payment_orders
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "payment_orders_update_own" on public.payment_orders;
create policy "payment_orders_update_own"
on public.payment_orders
for update
to authenticated
using (auth.uid() = user_id);

-- updated_at 자동 갱신
drop trigger if exists trg_payment_orders_updated_at on public.payment_orders;
create trigger trg_payment_orders_updated_at
before update on public.payment_orders
for each row
execute function public.set_updated_at();


