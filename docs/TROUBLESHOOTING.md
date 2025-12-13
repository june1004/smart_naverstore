# 문제 해결 가이드 (Troubleshooting)

## Edge Function 에러 해결

### 1. `gemini-seo-recommend` 400 에러

**증상:**
```
Failed to load resource: the server responded with a status of 400
Edge Function returned a non-2xx status code
```

**원인:**
- `GEMINI_API_KEY`가 Supabase Secrets에 설정되지 않음
- 요청 본문에 필수 파라미터 누락

**해결 방법:**

1. **Gemini API 키 발급:**
   - [Google AI Studio](https://makersuite.google.com/app/apikey)에서 API 키 발급
   - 또는 [Google Cloud Console](https://console.cloud.google.com/)에서 Gemini API 활성화 후 키 발급

2. **Supabase Secrets 설정:**
   ```bash
   # Supabase CLI 사용
   supabase secrets set GEMINI_API_KEY="your-api-key-here"
   
   # 또는 Supabase 대시보드에서:
   # Project Settings → Edge Functions → Secrets → Add Secret
   # Key: GEMINI_API_KEY
   # Value: your-api-key-here
   ```

3. **Edge Function 배포:**
   ```bash
   # 배포 스크립트 사용 (권장)
   ./scripts/deploy-gemini-function.sh
   
   # 또는 직접 배포
   supabase functions deploy gemini-seo-recommend
   ```
   
   **중요:** Edge Function이 배포되지 않으면 404 에러가 발생합니다.

### 2. 인증 토큰 400 에러

**증상:**
```
oypfuvxiiznlasmadnzr.supabase.co/auth/v1/token?grant_type=password:1
Failed to load resource: the server responded with a status of 400
```

**원인:**
- 로그인 시 잘못된 이메일/비밀번호
- Supabase 인증 설정 문제

**해결 방법:**
- 이메일과 비밀번호를 확인하세요
- 회원가입이 완료되었는지 확인하세요
- Supabase 대시보드에서 Authentication 설정 확인

### 3. 404 에러

**증상:**
```
Failed to load resource: the server responded with a status of 404
```

**원인:**
- Edge Function이 배포되지 않음
- 잘못된 함수 이름

**해결 방법:**
```bash
# 모든 Edge Functions 배포
./scripts/deploy-edge-functions.sh

# 또는 개별 배포
supabase functions deploy gemini-seo-recommend
```

## 일반적인 문제

### Edge Function 로그 확인

```bash
# 최근 로그 확인 (CLI 버전에 따라 --follow 플래그가 지원되지 않을 수 있음)
supabase functions logs gemini-seo-recommend

# 또는 Supabase 대시보드에서 확인:
# https://supabase.com/dashboard/project/oypfuvxiiznlasmadnzr/functions/gemini-seo-recommend/logs
```

### Supabase 프로젝트 링크 확인

```bash
# 프로젝트 링크 상태 확인
supabase link --project-ref oypfuvxiiznlasmadnzr

# 링크가 안 되어 있다면
supabase link --project-ref oypfuvxiiznlasmadnzr
```

## 필요한 환경 변수 (Secrets)

다음 Secrets가 Supabase에 설정되어 있어야 합니다:

1. **GEMINI_API_KEY** - Gemini API 키 (SEO 최적화 기능용)
2. **NAVER_CLIENT_ID** - 네이버 검색 API 클라이언트 ID
3. **NAVER_CLIENT_SECRET** - 네이버 검색 API 클라이언트 Secret
4. **NAVER_SOLUTION_ID** - 네이버 커머스 API 솔루션 ID
5. **NAVER_APPLICATION_ID** - 네이버 커머스 API 애플리케이션 ID
6. **NAVER_APPLICATION_SECRET** - 네이버 커머스 API 애플리케이션 Secret

설정 방법:
```bash
supabase secrets set GEMINI_API_KEY="your-key"
supabase secrets set NAVER_CLIENT_ID="your-id"
# ... 나머지도 동일하게
```

또는 Supabase 대시보드에서:
- Project Settings → Edge Functions → Secrets

