-- hymini1@naver.com을 수퍼관리자로 설정
-- 이메일로 사용자 ID를 찾아서 업데이트

UPDATE public.profiles
SET is_super_admin = true,
    is_paid_subscriber = true,
    store_addon_active = true
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'hymini1@naver.com'
);

-- 업데이트 결과 확인 (선택사항)
-- SELECT id, email, is_super_admin, is_paid_subscriber, store_addon_active
-- FROM public.profiles
-- WHERE id IN (SELECT id FROM auth.users WHERE email = 'hymini1@naver.com');

