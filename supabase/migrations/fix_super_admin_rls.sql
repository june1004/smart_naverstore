-- RLS 무한 재귀 문제 수정 마이그레이션
-- 기존 정책을 삭제하고 SECURITY DEFINER 함수를 사용하는 정책으로 교체

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update profiles" ON public.profiles;

-- 2. is_super_admin 함수 재생성 (RLS 우회를 위해 SECURITY DEFINER 사용)
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

-- 3. 새로운 RLS 정책 생성 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can update profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    public.is_super_admin(auth.uid())
  );

