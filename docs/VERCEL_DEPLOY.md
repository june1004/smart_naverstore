# Vercel 자동 배포(React + Vite) 설정 가이드

## 목표
- GitHub에 `git push` 하면 Vercel이 자동으로 빌드/배포되도록 설정합니다.
- React Router(SPA) 라우팅이 404가 나지 않도록 **rewrites**를 적용합니다.

## 1) Vercel 프로젝트 생성
1. Vercel → **New Project**
2. GitHub 리포지토리 선택: `june1004/smart_naverstore`
3. Framework Preset: **Vite**

## 2) Build 설정(권장)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 3) SPA 라우팅(필수)
이 프로젝트는 React Router를 사용하므로, 새로고침 시 404가 나지 않도록 rewrite가 필요합니다.

- 리포지토리에 `vercel.json`이 포함되어 있습니다.
- 내용:
  - 모든 경로를 `/`(index.html)로 rewrite

## 4) 환경 변수(Environment Variables)
Vercel Project → Settings → Environment Variables에 아래를 추가하세요.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> ⚠️ 비밀키/서비스 롤 키는 프론트에 넣으면 안 됩니다.

## 5) 자동 배포 동작 확인
- `main` 브랜치에 push → Preview/Production이 자동 업데이트됩니다.


