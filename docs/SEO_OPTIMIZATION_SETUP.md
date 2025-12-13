# SEO 자동 최적화 기능 설정 가이드

## 개요
Gemini AI를 사용하여 상품의 SEO를 최적화하고, 네이버 스마트스토어에 자동으로 반영하는 기능입니다.

## 필수 환경 변수 설정

### 1. Gemini API 키 설정

Supabase 대시보드에서 Edge Function Secrets에 다음을 추가하세요:

1. Supabase 대시보드 접속
2. Project Settings → Edge Functions → Secrets
3. 다음 Secret 추가:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Google AI Studio에서 발급받은 Gemini API 키

**Gemini API 키 발급 방법:**
1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. "Create API Key" 클릭
3. 생성된 API 키를 복사하여 Supabase Secrets에 추가

### 2. 네이버 커머스 API 설정 (이미 설정되어 있을 수 있음)

다음 Secrets가 이미 설정되어 있어야 합니다:
- `NAVER_APPLICATION_ID`: 네이버 커머스 API 애플리케이션 ID
- `NAVER_APPLICATION_SECRET`: 네이버 커머스 API 애플리케이션 Secret
- `NAVER_SOLUTION_ID`: 네이버 커머스 솔루션 ID (선택사항)

## 사용 방법

### 1. 상품 정보 입력
- **네이버 상품 ID**: 네이버 스마트스토어의 `originProductId` 입력
- **타겟 키워드**: SEO 최적화를 원하는 주요 키워드 입력
- **현재 상품명**: 기존 상품명 (선택사항)
- **카테고리**: 상품 카테고리 (선택사항)
- **현재 태그**: 기존 태그 목록 (선택사항, 최대 10개)
- **상세페이지 HTML**: 기존 상세페이지 HTML (선택사항)

### 2. AI 분석 시작
"✨ Gemini AI 최적화 분석 시작" 버튼을 클릭하면:
- Gemini AI가 상품 정보를 분석
- SEO 최적화된 상품명 제안
- 검색 태그 제안 (최대 10개)
- 상세페이지 HTML 수정안 제안

### 3. 검토 및 수정
- AI가 제안한 내용을 검토
- 상품명, 태그, HTML을 직접 수정 가능
- 태그는 추가/삭제 가능

### 4. 스토어 반영
"네이버 스토어 반영하기" 버튼을 클릭하면:
- 네이버 커머스 API를 통해 상품 정보가 업데이트됩니다
- 성공/실패 여부가 Toast 메시지로 표시됩니다

## API 엔드포인트

### Gemini SEO 추천
- **Function**: `gemini-seo-recommend`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "keyword": "타겟 키워드",
    "currentProductName": "현재 상품명",
    "currentDetailContent": "현재 상세페이지 HTML",
    "currentTags": ["태그1", "태그2"],
    "category": "카테고리",
    "competitorAnalysis": {}
  }
  ```
- **Response**:
  ```json
  {
    "recommended_name": "SEO 최적화된 상품명",
    "recommended_tags": ["태그1", "태그2", ...],
    "modified_html": "수정된 HTML"
  }
  ```

### 네이버 상품 업데이트
- **Function**: `naver-product-update`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "originProductId": "상품 ID",
    "product": {
      "name": "상품명",
      "detailContent": "상세페이지 HTML",
      "tags": ["태그1", "태그2"]
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "상품 정보가 성공적으로 업데이트되었습니다.",
    "data": {}
  }
  ```

## 주의사항

1. **네이버 상품 ID 확인**: `originProductId`는 네이버 스마트스토어에서 확인할 수 있습니다.
2. **HTML 제한**: 상세페이지 HTML에서 `iframe`과 `script` 태그는 자동으로 제거됩니다.
3. **태그 개수**: SEO 태그는 최대 10개까지 설정 가능합니다.
4. **API 호출 제한**: Gemini API와 네이버 커머스 API의 호출 제한을 확인하세요.

## 문제 해결

### Gemini API 오류
- API 키가 올바르게 설정되었는지 확인
- Google AI Studio에서 API 키 상태 확인
- Supabase Edge Function 로그 확인

### 네이버 커머스 API 오류
- 네이버 커머스 API 인증 정보 확인
- 상품 ID가 올바른지 확인
- 네이버 스마트스토어 권한 확인

## 참고 자료
- [Gemini API 문서](https://ai.google.dev/docs)
- [네이버 커머스 API 문서](https://apicenter.commerce.naver.com/docs/commerce-api/current)

