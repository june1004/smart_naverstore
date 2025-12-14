# Toss Payments 웹훅 설정 가이드

## 목표
결제 성공 페이지(`/pricing/success`)를 사용자가 닫거나 네트워크가 끊겨도, 서버가 **결제 상태를 자동 동기화**해서
`profiles`의 구독 권한을 안정적으로 반영합니다.

## 구성
- Edge Function: `toss-webhook`
  - 웹훅 요청을 받으면 **Toss 결제조회 API로 paymentKey를 검증**(위조 방지)
  - `payment_orders` 업데이트 + `profiles` 엔타이틀먼트 반영
  - 매칭되지 않는 이벤트는 `payment_webhook_events`에 저장

## 1) Supabase Secrets 설정
Supabase Dashboard → Project Settings → Edge Functions → Secrets에 추가:

- `TOSS_SECRET_KEY` (서버 시크릿 키)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

## 2) DB 마이그레이션 적용
- `supabase/migrations/20251214030000_payment_orders_toss.sql`
- `supabase/migrations/20251214031000_payment_orders_admin_rls.sql`

## 3) Toss 대시보드에서 웹훅 URL 등록
Toss Payments 대시보드에서 Webhook 설정을 찾아 아래 URL을 등록합니다.

- Webhook URL:
  - `https://<project-ref>.supabase.co/functions/v1/toss-webhook`
  - 예: `https://oypfuvxiiznlasmadnzr.supabase.co/functions/v1/toss-webhook`

## 4) 테스트 방법
1) `/pricing`에서 결제 진행
2) 결제 완료 후 `payment_orders`에 `status=paid` 반영 여부 확인
3) (관리자) `/admin`에서 결제/권한을 확인 (다음 단계에서 결제 로그 패널도 추가 가능)

## 참고(취소/환불)
현재 구현은 **paid 시점에만 엔타이틀먼트를 활성화**합니다.
취소/환불 시 자동 회수는 운영 정책(유예기간, 부분 환불 등)에 따라 달라서,
다음 단계에서 정책 확정 후 반영하는 것을 권장합니다.


