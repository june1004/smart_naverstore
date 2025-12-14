-- 구독/권한(엔타이틀먼트) 컬럼 추가
-- 목표:
-- - 대시보드 사용: 유료 구독(is_paid_subscriber)
-- - 스토어관리: 추가 구독(store_addon_active)

alter table public.profiles
  add column if not exists is_paid_subscriber boolean not null default false;

alter table public.profiles
  add column if not exists store_addon_active boolean not null default false;

create index if not exists profiles_is_paid_subscriber_idx
  on public.profiles (is_paid_subscriber);

create index if not exists profiles_store_addon_active_idx
  on public.profiles (store_addon_active);

-- 기존 수퍼관리자에게는 기본적으로 모두 활성화(운영 편의)
update public.profiles
set is_paid_subscriber = true,
    store_addon_active = true
where coalesce(is_super_admin, false) = true;


