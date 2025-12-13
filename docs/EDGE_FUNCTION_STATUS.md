# Edge Function 배포 상태

## 현재 배포된 함수 목록

터미널에서 `supabase functions list` 명령어로 확인한 결과:

✅ **배포 완료된 함수들:**

1. `auto-category-finder` - ACTIVE (Version 7)
2. `naver-shopping-search` - ACTIVE (Version 5)
3. `naver-keyword-extraction` - ACTIVE (Version 5)
4. `naver-shopping-insight` - ACTIVE (Version 5)
5. `naver-popular-keywords` - ACTIVE (Version 7)
6. `naver-datalab-trend` - ACTIVE (Version 7)
7. `naver-commerce-auth` - ACTIVE (Version 5)
8. `naver-product-list` - ACTIVE (Version 5)
9. `upload-categories` - ACTIVE (Version 6)
10. `naver-searchad-keywords` - ACTIVE (Version 4)
11. `trend-data` - ACTIVE (Version 7)
12. `searchterm-data` - ACTIVE (Version 6)
13. **`gemini-seo-recommend`** - ACTIVE (Version 6) ✅
14. `naver-product-update` - ACTIVE (Version 3)

## 404 에러가 계속 발생하는 경우

함수가 ACTIVE 상태인데도 404 에러가 발생한다면:

1. **브라우저 캐시 클리어**
   - 하드 리프레시: `Cmd + Shift + R` (Mac) 또는 `Ctrl + Shift + R` (Windows)

2. **함수 URL 확인**
   - 올바른 URL: `https://oypfuvxiiznlasmadnzr.supabase.co/functions/v1/gemini-seo-recommend`
   - 대소문자 구분 확인

3. **Supabase 대시보드에서 직접 확인**
   - https://supabase.com/dashboard/project/oypfuvxiiznlasmadnzr/functions
   - `gemini-seo-recommend` 함수가 목록에 있는지 확인
   - 함수를 클릭하여 상세 정보 확인

4. **로그 확인**
   ```bash
   supabase functions logs gemini-seo-recommend
   ```
   
   또는 Supabase 대시보드에서:
   - Functions → gemini-seo-recommend → Logs 탭

5. **함수 재배포**
   ```bash
   supabase functions deploy gemini-seo-recommend
   ```

## 필요한 Secrets 확인

다음 Secrets가 설정되어 있어야 합니다:

- ✅ `GEMINI_API_KEY` - Gemini API 키 (SEO 최적화 기능용)
- ✅ `NAVER_CLIENT_ID` - 네이버 검색 API
- ✅ `NAVER_CLIENT_SECRET` - 네이버 검색 API
- ✅ `NAVER_SOLUTION_ID` - 네이버 커머스 API
- ✅ `NAVER_APPLICATION_ID` - 네이버 커머스 API
- ✅ `NAVER_APPLICATION_SECRET` - 네이버 커머스 API

Secrets 확인:
```bash
supabase secrets list
```

또는 Supabase 대시보드:
- Project Settings → Edge Functions → Secrets

