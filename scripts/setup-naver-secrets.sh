#!/bin/bash

# 네이버 API Secrets를 Supabase에 설정하는 스크립트
# 사용법: ./scripts/setup-naver-secrets.sh

echo "🔐 네이버 API Secrets를 Supabase에 설정합니다..."

# Supabase 프로젝트 정보
PROJECT_ID="oypfuvxiiznlasmadnzr"

# 1. 네이버 검색 API (Search API) - 키워드 분석, 쇼핑 검색, 데이터랩용
# 용도: https://openapi.naver.com 호출
SEARCH_CLIENT_ID="3TJiEgpwuEMjQgS3EUnE"
SEARCH_CLIENT_SECRET="OvUL9mQZfL"

# 2. 네이버 커머스 API (Commerce API) - 내 스토어(duracoatmall) 관리용
# 용도: https://api.commerce.naver.com 호출
COMMERCE_SOLUTION_ID="SOL_1ngo6GoNhUdrR4Z6gwGM6U"
COMMERCE_APP_ID="2nOBx23rbwjcf05WdzrZti"
COMMERCE_APP_SECRET='$2a$04$4V/uKoVNr5r8.7QmSzg26u'

echo ""
echo "📋 설정할 Secrets:"
echo "  [검색 API - 쇼핑/트렌드 분석용]"
echo "  - NAVER_CLIENT_ID: $SEARCH_CLIENT_ID"
echo "  - NAVER_CLIENT_SECRET: $SEARCH_CLIENT_SECRET"
echo ""
echo "  [커머스 API - 스토어 관리용]"
echo "  - NAVER_SOLUTION_ID: $COMMERCE_SOLUTION_ID"
echo "  - NAVER_APPLICATION_ID: $COMMERCE_APP_ID"
echo "  - NAVER_APPLICATION_SECRET: (hidden)"
echo ""

echo "⚠️  Supabase CLI를 사용하여 Secrets를 설정합니다..."

# Supabase CLI가 설치되어 있는지 확인
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI가 설치되어 있지 않습니다. 'npm install -g supabase'로 설치해주세요."
    exit 1
fi

# Secrets 설정 명령 실행
# 주의: 특수문자가 포함된 Secret은 따옴표로 감싸야 함
supabase link --project-ref $PROJECT_ID
supabase secrets set \
  NAVER_CLIENT_ID="$SEARCH_CLIENT_ID" \
  NAVER_CLIENT_SECRET="$SEARCH_CLIENT_SECRET" \
  NAVER_SOLUTION_ID="$COMMERCE_SOLUTION_ID" \
  NAVER_APPLICATION_ID="$COMMERCE_APP_ID" \
  NAVER_APPLICATION_SECRET="$COMMERCE_APP_SECRET"

echo ""
echo "✅ 설정 완료! 이제 Edge Functions에서 해당 환경변수를 사용할 수 있습니다."
