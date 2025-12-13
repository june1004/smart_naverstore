#!/bin/bash

# 수퍼관리자 마이그레이션 적용 스크립트
# 사용법: ./scripts/apply-super-admin-migration.sh

echo "🔐 수퍼관리자 마이그레이션을 적용합니다..."

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

# 마이그레이션 파일 실행
echo ""
echo "🔄 마이그레이션 적용 중..."
supabase db push || {
    echo "❌ 마이그레이션 적용 실패"
    echo ""
    echo "대안: Supabase 대시보드에서 직접 SQL을 실행하세요:"
    echo "1. https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
    echo "2. supabase/migrations/add_super_admin.sql 파일의 내용을 복사하여 실행"
    exit 1
}

echo ""
echo "✅ 마이그레이션 적용 완료!"
echo ""
echo "📌 확인 사항:"
echo "1. june@nanumlab.com 계정으로 로그인"
echo "2. '서비스 관리' 탭에서 수퍼관리자 권한 확인"
echo "3. 네이버 API 설정 및 카테고리 업로드 기능 접근 가능 여부 확인"

