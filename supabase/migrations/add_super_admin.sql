-- 수퍼관리자 기능 추가 마이그레이션

-- 1. profiles 테이블에 is_super_admin 필드 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. 인덱스 생성 (수퍼관리자 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_admin ON public.profiles(is_super_admin) 
WHERE is_super_admin = true;

-- 3. june@nanumlab.com을 수퍼관리자로 설정
-- 이메일로 사용자 ID를 찾아서 업데이트
UPDATE public.profiles
SET is_super_admin = true
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'june@nanumlab.com'
);

-- 4. RLS 정책 업데이트: 수퍼관리자는 모든 프로필 조회 가능
-- SECURITY DEFINER 함수를 사용하여 무한 재귀 방지
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    public.is_super_admin(auth.uid())
  );

-- 5. 수퍼관리자는 자신의 프로필 업데이트 가능
DROP POLICY IF EXISTS "Super admins can update profiles" ON public.profiles;
CREATE POLICY "Super admins can update profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    public.is_super_admin(auth.uid())
  );

-- 6. 수퍼관리자 확인 함수 (RLS 우회를 위해 SECURITY DEFINER 사용)
-- 이 함수는 RLS 정책에서 사용되므로 무한 재귀를 방지하기 위해 SECURITY DEFINER로 설정
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- RLS를 우회하여 직접 조회 (SECURITY DEFINER이므로 가능)
  SELECT COALESCE(is_super_admin, false) INTO result
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(result, false);
END;
$$;

