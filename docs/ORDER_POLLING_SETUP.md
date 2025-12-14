# 주문 고객(전화/이메일) 폴링(매일) 설정 가이드

## 목표
네이버 정책상 시간이 지나면 주문 화면에서 **전화번호/이메일이 `***`로 마스킹**될 수 있습니다.  
따라서 **매일 1회**, 최근 N일(기본 7일) 주문을 조회하여 `customer_vault_entries`에 선저장합니다.

## 구성 요소
- **테이블**: `public.user_stores`
  - 사용자별 상점 등록 및 동기화 기간(`sync_days`, 기본 7일)
- **크론 함수**: `supabase/functions/naver-order-sync`
  - 매일 실행되어 `user_stores.enabled=true` 인 상점들을 순회하며 주문 조회 → 고객 저장소 업서트(B 정책)

## 1) DB 마이그레이션 적용
아래 마이그레이션을 Supabase에 적용하세요.

- `supabase/migrations/20251214010000_user_stores_for_sync.sql`

## 2) Secrets 설정
`naver-order-sync`는 보안을 위해 헤더 시크릿을 요구하도록 구현되어 있습니다.

- **Supabase Functions Secrets**
  - `CRON_SECRET`: 임의의 강한 문자열
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NAVER_APPLICATION_ID`
  - `NAVER_APPLICATION_SECRET`
  - (선택) `NAVER_SOLUTION_ID`

## 3) Scheduled Trigger(매일) 생성
Supabase Dashboard에서 Scheduled Trigger를 추가합니다.

- Function: `naver-order-sync`
- Schedule: 매일 1회 (예: `0 3 * * *` → KST 새벽 3시)
- Headers: `x-cron-secret: <CRON_SECRET>`

## 4) 프론트 설정
`/store` → 주문/결제 탭에서:
- “전화/이메일 폴링(매일) 설정”에서
  - **폴링 ON/OFF**
  - **기본 기간(sync_days)** (기본 7일)
  - 저장

## 동작 정책(B)
1) 연락처가 있으면 `phone:` 또는 `email:` 기반으로 고객을 **갱신**  
2) 연락처가 없으면 `order:` + 주문번호 기반으로 **중복 저장 방지**  
3) 마스킹된 전화/이메일은 **기존 값 위에 덮어쓰지 않음** (null로 업데이트하지 않음)


