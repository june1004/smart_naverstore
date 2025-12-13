-- 네이버 쇼핑몰 분석 도구 데이터베이스 스키마 초기화
-- 새 Supabase 프로젝트에 적용할 전체 스키마

-- 1. 사용자 프로필 테이블 생성
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  company_name TEXT,
  business_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. 네이버 카테고리 정보 테이블 생성
CREATE TABLE IF NOT EXISTS public.naver_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  parent_category_id TEXT,
  category_level INTEGER NOT NULL DEFAULT 1,
  category_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. 카테고리 CSV 업로드 기록 테이블 생성
CREATE TABLE IF NOT EXISTS public.category_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  upload_status TEXT NOT NULL DEFAULT 'processing',
  error_details JSONB,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. 키워드 분석 결과 테이블 생성
CREATE TABLE IF NOT EXISTS public.keyword_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. 스토어 분석 결과 테이블 생성
CREATE TABLE IF NOT EXISTS public.store_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL,
  store_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_naver_categories_category_id ON public.naver_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_naver_categories_parent_id ON public.naver_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_naver_categories_level ON public.naver_categories(category_level);
CREATE INDEX IF NOT EXISTS idx_keyword_analysis_user_id ON public.keyword_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_store_analysis_user_id ON public.store_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_category_uploads_user_id ON public.category_uploads(uploaded_by);

-- 7. Row Level Security (RLS) 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naver_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_analysis ENABLE ROW LEVEL SECURITY;

-- 8. RLS 정책 생성

-- profiles 테이블 정책
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- naver_categories 테이블 정책 (모든 인증된 사용자가 읽기 가능, 익명 사용자도 읽기 가능)
DROP POLICY IF EXISTS "Anyone can view categories" ON public.naver_categories;
CREATE POLICY "Anyone can view categories" ON public.naver_categories
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create categories" ON public.naver_categories;
CREATE POLICY "Anyone can create categories" ON public.naver_categories
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update categories" ON public.naver_categories;
CREATE POLICY "Anyone can update categories" ON public.naver_categories
  FOR UPDATE TO authenticated USING (true);

-- category_uploads 테이블 정책
DROP POLICY IF EXISTS "Users can view their uploads" ON public.category_uploads;
CREATE POLICY "Users can view their uploads" ON public.category_uploads
  FOR SELECT USING (auth.uid() = uploaded_by);
DROP POLICY IF EXISTS "Users can create uploads" ON public.category_uploads;
CREATE POLICY "Users can create uploads" ON public.category_uploads
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- keyword_analysis 테이블 정책
DROP POLICY IF EXISTS "Users can view own keyword analysis" ON public.keyword_analysis;
CREATE POLICY "Users can view own keyword analysis" ON public.keyword_analysis
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create keyword analysis" ON public.keyword_analysis;
CREATE POLICY "Users can create keyword analysis" ON public.keyword_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own keyword analysis" ON public.keyword_analysis;
CREATE POLICY "Users can update own keyword analysis" ON public.keyword_analysis
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own keyword analysis" ON public.keyword_analysis;
CREATE POLICY "Users can delete own keyword analysis" ON public.keyword_analysis
  FOR DELETE USING (auth.uid() = user_id);

-- store_analysis 테이블 정책
DROP POLICY IF EXISTS "Users can view own store analysis" ON public.store_analysis;
CREATE POLICY "Users can view own store analysis" ON public.store_analysis
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create store analysis" ON public.store_analysis;
CREATE POLICY "Users can create store analysis" ON public.store_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own store analysis" ON public.store_analysis;
CREATE POLICY "Users can update own store analysis" ON public.store_analysis
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own store analysis" ON public.store_analysis;
CREATE POLICY "Users can delete own store analysis" ON public.store_analysis
  FOR DELETE USING (auth.uid() = user_id);

-- 9. 새 사용자 생성 시 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 10. 새 사용자 생성 트리거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

