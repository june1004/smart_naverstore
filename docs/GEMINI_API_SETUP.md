# Gemini API 설정 가이드

## 500 Internal Server Error 해결

`gemini-seo-recommend` Edge Function에서 500 에러가 발생하는 경우, 대부분 `GEMINI_API_KEY`가 설정되지 않았기 때문입니다.

## 설정 방법

### 1. Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. "Create API Key" 클릭
3. API 키 복사

### 2. Supabase Secrets에 설정

#### 방법 1: Supabase CLI 사용 (권장)

```bash
supabase secrets set GEMINI_API_KEY="your-api-key-here"
```

#### 방법 2: Supabase 대시보드 사용

1. https://supabase.com/dashboard/project/oypfuvxiiznlasmadnzr/settings/functions 접속
2. "Secrets" 탭 클릭
3. "Add Secret" 클릭
4. Key: `GEMINI_API_KEY`
5. Value: 발급받은 API 키 입력
6. "Save" 클릭

### 3. Edge Function 재배포 (선택사항)

Secrets를 설정한 후에는 Edge Function을 재배포할 필요가 없습니다. 하지만 변경사항이 반영되지 않으면:

```bash
supabase functions deploy gemini-seo-recommend --project-ref oypfuvxiiznlasmadnzr
```

## 확인 방법

### Secrets 확인

```bash
supabase secrets list
```

`GEMINI_API_KEY`가 목록에 있는지 확인하세요.

### 로그 확인

Supabase 대시보드에서:
1. https://supabase.com/dashboard/project/oypfuvxiiznlasmadnzr/functions/gemini-seo-recommend 접속
2. "Logs" 탭 클릭
3. 최근 요청의 로그 확인

로그에서 `GEMINI_API_KEY 확인:` 메시지를 찾아 키가 설정되어 있는지 확인할 수 있습니다.

## 문제 해결

### 여전히 500 에러가 발생하는 경우

1. **API 키 형식 확인**
   - API 키는 `AIza...`로 시작해야 합니다
   - 공백이나 특수문자가 포함되지 않았는지 확인

2. **API 키 권한 확인**
   - Google AI Studio에서 API 키가 활성화되어 있는지 확인
   - Gemini API 사용 권한이 있는지 확인

3. **로그 확인**
   - Supabase 대시보드의 함수 로그에서 상세한 에러 메시지 확인
   - `GEMINI_API_KEY 확인:` 로그에서 키 상태 확인

4. **모델 이름 확인**
   - 현재 사용 중인 모델: `gemini-1.5-flash`
   - API 버전: `v1`

## 참고 자료

- [Gemini API 문서](https://ai.google.dev/docs)
- [Google AI Studio](https://makersuite.google.com/app/apikey)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)

