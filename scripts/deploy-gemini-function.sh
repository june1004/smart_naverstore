#!/bin/bash

# gemini-seo-recommend Edge Function 배포 스크립트
# 사용법: ./scripts/deploy-gemini-function.sh

echo "🚀 gemini-seo-recommend Edge Function 배포를 시작합니다..."

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

# Edge Function 배포
echo ""
echo "🔄 gemini-seo-recommend 배포 중..."
supabase functions deploy gemini-seo-recommend || {
    echo "❌ 배포 실패"
    exit 1
}

echo ""
echo "✅ 배포 완료!"
echo ""
echo "📌 다음 단계:"
echo "1. Supabase 대시보드에서 Secrets 확인:"
echo "   https://supabase.com/dashboard/project/$PROJECT_ID/settings/functions"
echo "2. GEMINI_API_KEY가 설정되어 있는지 확인:"
echo "   supabase secrets set GEMINI_API_KEY=\"your-api-key-here\""
echo ""
echo "3. 로그 확인:"
echo "   supabase functions logs gemini-seo-recommend --follow"

