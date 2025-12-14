-- 연락처(휴대폰/이메일)가 없는 주문도 중복 저장을 막기 위해, 주문번호(order_id)로 중복 갱신 지원
-- 목적: 주문 API를 재조회/재동기화해도 같은 주문이 중복 저장되지 않게 함

create unique index if not exists customer_vault_entries_order_id_uq
  on public.customer_vault_entries (user_id, order_id)
  where order_id is not null;


