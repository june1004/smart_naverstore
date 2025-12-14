-- 고객 저장소 중복 정책(B): 휴대폰/이메일 기준으로 기존 고객을 갱신
-- 구현 방식:
-- - contact_key: phone(정규화) 우선, 없으면 lower(email)
-- - (user_id, contact_key) 유니크로 upsert 가능하게 함
-- - updated_at 추가 및 자동 갱신 트리거
-- - upsert는 내부적으로 UPDATE가 발생할 수 있으므로 UPDATE RLS policy 추가

alter table public.customer_vault_entries
  add column if not exists contact_key text null,
  add column if not exists updated_at timestamptz not null default now();

-- 기존 데이터 backfill (가능한 경우만)
update public.customer_vault_entries
set contact_key = coalesce(nullif(trim(phone), ''), nullif(lower(trim(email)), ''))
where contact_key is null;

-- 동일 유저 내에서 contact_key는 유니크(단, null은 허용 → 연락처 없는 메모는 계속 여러 건 저장 가능)
create unique index if not exists customer_vault_entries_contact_key_uq
  on public.customer_vault_entries (user_id, contact_key)
  where contact_key is not null;

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customer_vault_entries_updated_at on public.customer_vault_entries;
create trigger trg_customer_vault_entries_updated_at
before update on public.customer_vault_entries
for each row
execute function public.set_updated_at();

-- upsert를 위해 update 권한 필요 (본인 데이터만)
drop policy if exists "customer_vault_entries_update_own" on public.customer_vault_entries;
create policy "customer_vault_entries_update_own"
on public.customer_vault_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


