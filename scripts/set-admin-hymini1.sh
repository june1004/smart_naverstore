#!/bin/bash

# hymini1@naver.com을 수퍼관리자로 설정하는 스크립트
# 사용법: ./scripts/set-admin-hymini1.sh

echo "🔐 hymini1@naver.com을 수퍼관리자로 설정합니다..."

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
}

# SQL 쿼리 실행
echo ""
echo "🔄 관리자 권한 설정 중..."
supabase db execute "
UPDATE public.profiles
SET is_super_admin = true,
    is_paid_subscriber = true,
    store_addon_active = true
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'hymini1@naver.com'
);
" || {
    echo "❌ 관리자 권한 설정 실패"
    echo ""
    echo "대안: Supabase 대시보드에서 직접 SQL을 실행하세요:"
    echo "1. https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
    echo "2. 다음 SQL을 복사하여 실행:"
    echo ""
    echo "UPDATE public.profiles"
    echo "SET is_super_admin = true,"
    echo "    is_paid_subscriber = true,"
    echo "    store_addon_active = true"
    echo "WHERE id IN ("
    echo "  SELECT id FROM auth.users"
    echo "  WHERE email = 'hymini1@naver.com'"
    echo ");"
    exit 1
}

echo ""
echo "✅ 관리자 권한 설정 완료!"
echo ""
echo "📌 확인 사항:"
echo "1. hymini1@naver.com 계정으로 로그인"
echo "2. '서비스 관리' 탭에서 수퍼관리자 권한 확인"
echo "3. 네이버 API 설정 및 카테고리 업로드 기능 접근 가능 여부 확인"

