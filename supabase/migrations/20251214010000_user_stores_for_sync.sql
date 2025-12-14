-- 주문/고객 정보 자동 동기화(폴링)용 상점 등록 테이블
-- 목적: 사용자별로 상점명(account_id)과 동기화 기간(sync_days)을 저장하고, 매일 크론으로 동기화

create table if not exists public.user_stores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  store_name text not null,
  enabled boolean not null default true,
  sync_days int not null default 7,
  last_synced_at timestamptz null
);

create unique index if not exists user_stores_user_store_uq
  on public.user_stores (user_id, store_name);

create index if not exists user_stores_enabled_idx
  on public.user_stores (enabled, updated_at desc);

alter table public.user_stores enable row level security;

drop policy if exists "user_stores_select_own" on public.user_stores;
create policy "user_stores_select_own"
on public.user_stores
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_stores_insert_own" on public.user_stores;
create policy "user_stores_insert_own"
on public.user_stores
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_stores_update_own" on public.user_stores;
create policy "user_stores_update_own"
on public.user_stores
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_stores_delete_own" on public.user_stores;
create policy "user_stores_delete_own"
on public.user_stores
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_stores_updated_at on public.user_stores;
create trigger trg_user_stores_updated_at
before update on public.user_stores
for each row
execute function public.set_updated_at();


