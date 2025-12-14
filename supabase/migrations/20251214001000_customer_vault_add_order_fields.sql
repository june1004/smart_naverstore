-- 고객(구매자) 저장소 확장: CS에 필요한 주문 고객 필드 추가
-- 목표 필드: 주문일시 / 이름 / 휴대폰 / 주소 / 이메일 (+추적용 주문번호)

alter table public.customer_vault_entries
  add column if not exists order_id text null,
  add column if not exists ordered_at timestamptz null,
  add column if not exists address text null;

create index if not exists customer_vault_entries_ordered_at_idx
  on public.customer_vault_entries (user_id, ordered_at desc);


