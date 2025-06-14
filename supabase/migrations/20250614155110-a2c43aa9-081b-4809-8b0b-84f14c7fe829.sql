
-- 네이버 카테고리 정보를 저장할 테이블 생성
CREATE TABLE public.naver_categories (
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

-- 카테고리 ID에 인덱스 추가
CREATE INDEX idx_naver_categories_category_id ON public.naver_categories(category_id);
CREATE INDEX idx_naver_categories_parent_id ON public.naver_categories(parent_category_id);
CREATE INDEX idx_naver_categories_level ON public.naver_categories(category_level);

-- RLS 정책 설정 (모든 사용자가 읽기 가능, 관리자만 쓰기 가능)
ALTER TABLE public.naver_categories ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 카테고리 정보를 읽을 수 있음
CREATE POLICY "Anyone can view categories" 
  ON public.naver_categories 
  FOR SELECT 
  TO authenticated
  USING (true);

-- 모든 인증된 사용자가 카테고리를 생성할 수 있음 (CSV 업로드용)
CREATE POLICY "Anyone can create categories" 
  ON public.naver_categories 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- 모든 인증된 사용자가 카테고리를 수정할 수 있음
CREATE POLICY "Anyone can update categories" 
  ON public.naver_categories 
  FOR UPDATE 
  TO authenticated
  USING (true);

-- CSV 업로드 기록을 저장할 테이블
CREATE TABLE public.category_uploads (
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

-- 업로드 기록 테이블 RLS 설정
ALTER TABLE public.category_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their uploads" 
  ON public.category_uploads 
  FOR SELECT 
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can create uploads" 
  ON public.category_uploads 
  FOR INSERT 
  WITH CHECK (auth.uid() = uploaded_by);
