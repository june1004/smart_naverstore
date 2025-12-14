#!/bin/bash

# 고객(구매자) 저장소 테이블을 Supabase DB에 적용하는 스크립트
# 전제: supabase CLI 설치 + 프로젝트 링크/로그인 완료

set -euo pipefail

PROJECT_ID="oypfuvxiiznlasmadnzr"
MIGRATION_FILE="supabase/migrations/20251214000000_customer_vault_entries.sql"

echo "📋 프로젝트 링크 확인 중..."
supabase link --project-ref "$PROJECT_ID" || true

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ 마이그레이션 파일을 찾을 수 없습니다: $MIGRATION_FILE"
  exit 1
fi

echo "🚀 고객 저장소 마이그레이션 적용: $MIGRATION_FILE"
echo "⚠️  주의: 환경에 따라 DB 적용 방식이 다를 수 있습니다. 아래 명령이 실패하면 Dashboard SQL Editor로 적용하세요."

# supabase db push는 로컬 마이그레이션 상태/프로젝트 설정에 따라 동작이 달라질 수 있습니다.
# 이 스크립트는 안내용이며, 팀 표준 방식에 맞춰 조정할 수 있습니다.
supabase db push

echo "✅ 완료!"


