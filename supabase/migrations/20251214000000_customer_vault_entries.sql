-- 고객(구매자) 저장소: 주문/문의 화면에서 복사한 정보를 안전하게(계정별) 저장하기 위한 테이블
-- 적용 방법: Supabase SQL Editor에서 실행하거나, CLI 연결 후 `supabase db push`

create table if not exists public.customer_vault_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  title text not null,
  raw_text text not null,
  buyer_name text null,
  phone text null,
  email text null,
  memo text null
);

create index if not exists customer_vault_entries_user_id_idx
  on public.customer_vault_entries (user_id, created_at desc);

alter table public.customer_vault_entries enable row level security;

-- 본인 데이터만 조회
drop policy if exists "customer_vault_entries_select_own" on public.customer_vault_entries;
create policy "customer_vault_entries_select_own"
on public.customer_vault_entries
for select
to authenticated
using (auth.uid() = user_id);

-- 본인 데이터만 생성
drop policy if exists "customer_vault_entries_insert_own" on public.customer_vault_entries;
create policy "customer_vault_entries_insert_own"
on public.customer_vault_entries
for insert
to authenticated
with check (auth.uid() = user_id);

-- 본인 데이터만 삭제
drop policy if exists "customer_vault_entries_delete_own" on public.customer_vault_entries;
create policy "customer_vault_entries_delete_own"
on public.customer_vault_entries
for delete
to authenticated
using (auth.uid() = user_id);


