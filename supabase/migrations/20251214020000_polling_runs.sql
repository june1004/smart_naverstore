-- 폴링(주문 동기화) 실행 결과를 저장하여 모니터링/통계를 가능하게 합니다.

create table if not exists public.polling_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid null references public.user_stores(id) on delete set null,
  store_name text not null,
  sync_days int not null default 7,
  from_iso text null,
  to_iso text null,
  status text not null, -- success | error
  upserted int not null default 0,
  duration_ms int null,
  source_url text null,
  error_text text null
);

create index if not exists polling_runs_user_created_idx
  on public.polling_runs (user_id, created_at desc);

create index if not exists polling_runs_store_created_idx
  on public.polling_runs (store_name, created_at desc);

alter table public.polling_runs enable row level security;

-- 본인 기록 조회
drop policy if exists "polling_runs_select_own" on public.polling_runs;
create policy "polling_runs_select_own"
on public.polling_runs
for select
to authenticated
using (auth.uid() = user_id);

-- 수퍼관리자는 전체 조회 가능
drop policy if exists "polling_runs_select_super_admin" on public.polling_runs;
create policy "polling_runs_select_super_admin"
on public.polling_runs
for select
to authenticated
using (public.is_super_admin(auth.uid()));


