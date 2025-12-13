#!/bin/bash

# Supabase Edge Functions 배포 스크립트
# 사용법: ./scripts/deploy-edge-functions.sh

echo "🚀 Supabase Edge Functions 배포를 시작합니다..."

PROJECT_ID="oypfuvxiiznlasmadnzr"

# Supabase CLI가 설치되어 있는지 확인
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI가 설치되어 있지 않습니다."
    echo "   설치: npm install -g supabase"
    exit 1
fi

# 프로젝트 링크 확인
echo "📋 프로젝트 링크 확인 중..."
supabase link --project-ref $PROJECT_ID || {
    echo "⚠️  프로젝트 링크 실패. 이미 링크되어 있거나 로그인이 필요할 수 있습니다."
    echo "   수동으로 링크: supabase link --project-ref $PROJECT_ID"
}

# 배포할 함수 목록
FUNCTIONS=(
  "auto-category-finder"
  "naver-shopping-search"
  "naver-keyword-extraction"
  "naver-searchad-keywords"
  "naver-shopping-insight"
  "naver-popular-keywords"
  "naver-datalab-trend"
  "trend-data"
  "searchterm-data"
  "naver-commerce-auth"
  "naver-product-list"
  "naver-product-update"
  "gemini-seo-recommend"
  "upload-categories"
)

echo ""
echo "📦 배포할 Edge Functions:"
for func in "${FUNCTIONS[@]}"; do
  echo "  - $func"
done

echo ""
read -p "계속하시겠습니까? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "배포가 취소되었습니다."
    exit 1
fi

# 각 함수 배포
for func in "${FUNCTIONS[@]}"; do
  echo ""
  echo "🔄 $func 배포 중..."
  supabase functions deploy $func || {
    echo "❌ $func 배포 실패"
  }
done

echo ""
echo "✅ 배포 완료!"
echo ""
echo "📌 다음 단계:"
echo "1. Supabase 대시보드에서 Secrets 확인:"
echo "   https://supabase.com/dashboard/project/$PROJECT_ID/settings/functions"
echo "2. 다음 환경 변수가 설정되어 있는지 확인:"
echo "   - NAVER_CLIENT_ID"
echo "   - NAVER_CLIENT_SECRET"
echo "   - NAVER_APPLICATION_ID (커머스 API용)"
echo "   - NAVER_APPLICATION_SECRET (커머스 API용)"
echo "   - GEMINI_API_KEY (SEO 최적화 기능용)"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"

