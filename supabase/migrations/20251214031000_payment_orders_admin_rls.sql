-- 관리자(수퍼관리자) 결제 주문 조회 권한 + 웹훅 이벤트 테이블

-- 1) 수퍼관리자에게 payment_orders 전체 조회 권한 부여
drop policy if exists "payment_orders_select_super_admin" on public.payment_orders;
create policy "payment_orders_select_super_admin"
on public.payment_orders
for select
to authenticated
using (public.is_super_admin(auth.uid()));

-- 2) 웹훅 이벤트(매칭 실패/디버깅용)
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null default 'toss',
  event_type text null,
  order_id text null,
  payment_key text null,
  status text null,
  raw jsonb null,
  error_text text null
);

create index if not exists payment_webhook_events_created_idx
  on public.payment_webhook_events (created_at desc);

alter table public.payment_webhook_events enable row level security;

drop policy if exists "payment_webhook_events_select_super_admin" on public.payment_webhook_events;
create policy "payment_webhook_events_select_super_admin"
on public.payment_webhook_events
for select
to authenticated
using (public.is_super_admin(auth.uid()));


