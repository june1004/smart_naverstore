#!/bin/bash

# 네이버 커머스 API Secrets를 Supabase에 설정하는 스크립트
# 사용법: ./scripts/setup-naver-secrets.sh

echo "🔐 네이버 커머스 API Secrets를 Supabase에 설정합니다..."

# Supabase 프로젝트 정보
PROJECT_ID="oypfuvxiiznlasmadnzr"
SUPABASE_URL="https://oypfuvxiiznlasmadnzr.supabase.co"

# 네이버 커머스 API 정보
SOLUTION_ID="SOL_1ngo6GoNhUdrR4Z6gwGM6U"
APPLICATION_ID="2nOBx23rbwjcf05WdzrZti"
APPLICATION_SECRET="$2a$04$4V/uKoVNr5r8.7QmSzg26u"

echo ""
echo "📋 설정할 Secrets:"
echo "  - NAVER_SOLUTION_ID: $SOLUTION_ID"
echo "  - NAVER_APPLICATION_ID: $APPLICATION_ID"
echo "  - NAVER_APPLICATION_SECRET: $APPLICATION_SECRET"
echo ""
echo "⚠️  Supabase CLI를 사용하여 Secrets를 설정하세요:"
echo ""
echo "1. Supabase CLI 설치 (아직 설치하지 않은 경우):"
echo "   npm install -g supabase"
echo ""
echo "2. Supabase 로그인:"
echo "   supabase login"
echo ""
echo "3. 프로젝트 링크:"
echo "   supabase link --project-ref $PROJECT_ID"
echo ""
echo "4. Secrets 설정:"
echo "   supabase secrets set NAVER_SOLUTION_ID=$SOLUTION_ID"
echo "   supabase secrets set NAVER_APPLICATION_ID=$APPLICATION_ID"
echo "   supabase secrets set NAVER_APPLICATION_SECRET='$APPLICATION_SECRET'"
echo ""
echo "또는 Supabase 대시보드에서 직접 설정:"
echo "   https://supabase.com/dashboard/project/$PROJECT_ID/settings/functions"
echo "   → Secrets 섹션에서 위의 환경 변수들을 추가하세요."
echo ""

