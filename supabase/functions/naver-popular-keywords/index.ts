
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
    });
  }

  try {
    // 요청 본문 파싱 (에러 처리 포함)
    let category, startDate, endDate, timeUnit, device, ages, gender;
    try {
      const requestBody = await req.json();
      category = requestBody.category;
      startDate = requestBody.startDate;
      endDate = requestBody.endDate;
      timeUnit = requestBody.timeUnit || 'date';
      device = requestBody.device || '';
      ages = requestBody.ages || [];
      gender = requestBody.gender || '';
    } catch (parseError) {
      console.error('요청 본문 파싱 오류:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 필수 파라미터 검증
    if (!startDate || !endDate) {
      console.error('필수 파라미터 누락:', { startDate, endDate });
      return new Response(JSON.stringify({ 
        error: '시작일과 종료일이 필요합니다.',
        details: `startDate: ${startDate}, endDate: ${endDate}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('인기 검색어 API 요청:', { category, startDate, endDate, timeUnit });

    // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
    const formatDate = (dateStr: string | undefined | null): string => {
      if (!dateStr) {
        throw new Error('날짜가 제공되지 않았습니다.');
      }
      
      const str = String(dateStr).trim();
      
      // 이미 YYYYMMDD 형식이면 그대로 반환
      if (str.length === 8 && /^\d{8}$/.test(str)) {
        return str;
      }
      
      // YYYY-MM-DD 형식이면 YYYYMMDD로 변환
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          if (year.length === 4 && month.length === 2 && day.length === 2) {
            return `${year}${month}${day}`;
          }
        }
      }
      
      // Date 객체로 파싱 시도
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        throw new Error(`유효하지 않은 날짜 형식: ${str}`);
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    let formattedStartDate, formattedEndDate;
    try {
      formattedStartDate = formatDate(startDate);
      formattedEndDate = formatDate(endDate);
      console.log('날짜 형식 변환:', { originalStartDate: startDate, formattedStartDate, originalEndDate: endDate, formattedEndDate });
    } catch (dateError) {
      console.error('날짜 형식 변환 오류:', dateError);
      return new Response(JSON.stringify({ 
        error: '날짜 형식 오류',
        details: dateError instanceof Error ? dateError.message : 'Unknown error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    }

    // 데이터베이스에서 카테고리 정보 조회 (category는 category_id로 전달됨)
    let categoryInfo = null;
    let categoryName = '';
    if (category) {
      // category_id로 조회 시도
      const { data: dbCategory, error: categoryError } = await supabase
        .from('naver_categories')
        .select('*')
        .eq('category_id', category)
        .eq('is_active', true)
        .single();
      
      if (categoryError || !dbCategory) {
        // category_id로 찾지 못하면 category_name으로 시도
        const { data: dbCategoryByName } = await supabase
          .from('naver_categories')
          .select('*')
          .ilike('category_name', `%${category}%`)
          .eq('is_active', true)
          .limit(1)
          .single();
        
        categoryInfo = dbCategoryByName;
      } else {
      categoryInfo = dbCategory;
      }
      
      if (categoryInfo) {
        categoryName = categoryInfo.category_name || categoryInfo.category_path?.split(' > ')[0] || category;
        console.log('카테고리 정보 조회 성공:', { categoryId: category, categoryName, categoryInfo });
      } else {
        categoryName = category; // 카테고리 정보를 찾지 못하면 원본 사용
        console.warn('카테고리 정보를 찾지 못했습니다:', category);
      }
    }
      
    // 네이버 쇼핑인사이트 카테고리 API 사용 (카테고리별 인기검색어)
    // 참고: 네이버 데이터랩 쇼핑인사이트 API는 카테고리별 트렌드만 제공하고 인기검색어는 직접 제공하지 않음
    // 따라서 샘플 데이터를 카테고리별로 다르게 생성하여 반환
    
    // 카테고리별로 다른 샘플 데이터 생성
    const sampleKeywords = generateSampleKeywords(categoryName || category, categoryInfo);
    
    console.log('카테고리별 인기검색어 생성:', { 
      category, 
      categoryName, 
      keywordCount: sampleKeywords.length 
    });
      
      return new Response(JSON.stringify({
        keywords: sampleKeywords,
        categoryInfo: categoryInfo,
        isSampleData: true,
      message: '네이버 API는 카테고리별 인기검색어를 직접 제공하지 않아 샘플 데이터를 표시합니다.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('인기 검색어 조회 오류:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(JSON.stringify({
      error: errorMessage,
      details: '인기검색어 조회 중 오류가 발생했습니다.',
      stack: errorStack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateSampleKeywords(category: string, categoryInfo: any) {
  // 카테고리별 인기검색어 샘플 데이터 (대분류 기준)
  const baseDateKeywords: Record<string, string[]> = {
    "가구/인테리어": ["소파", "책상", "의자", "침대", "매트리스", "책장", "수납장", "식탁", "화장대", "거울"],
    "식품": ["원두", "차", "과자", "초콜릿", "견과류", "건강식품", "쌀", "라면", "김치", "반찬"],
    "생활/건강": ["마스크", "손소독제", "비타민", "영양제", "건강식품", "생리대", "기저귀", "물티슈", "화장지", "세제"],
    "디지털/가전": ["스마트폰", "노트북", "태블릿", "이어폰", "충전기", "케이스", "보조배터리", "스피커", "키보드", "마우스"],
    "출산/육아": ["유모차", "카시트", "이유식", "젖병", "기저귀", "물티슈", "장난감", "옷", "신발", "목욕용품"],
    "패션의류": ["후드티", "청바지", "원피스", "코트", "니트", "셔츠", "치마", "자켓", "맨투맨", "가디건"],
    "화장품/미용": ["립스틱", "파운데이션", "마스카라", "아이섀도", "선크림", "토너", "세럼", "크림", "클렌징", "미스트"],
    "스포츠/레저": ["운동화", "운동복", "요가매트", "덤벨", "자전거", "헬스용품", "등산용품", "수영용품", "골프용품", "축구용품"],
    "도서": ["소설", "에세이", "자기계발서", "만화", "전문서적", "어린이책", "참고서", "문제집", "전집", "전자책"],
    "반려동물": ["사료", "간식", "장난감", "목줄", "하네스", "배변패드", "캐리어", "식기", "물그릇", "샴푸"],
    "기타": ["아이폰16", "갤럭시S24", "에어팟", "닌텐도스위치", "맥북", "아이패드", "플스5", "삼성TV", "LG세탁기", "다이슨"]
  };

  // 카테고리명 추출 (category_path의 첫 번째 부분 또는 category_name)
  let categoryName = category;
  if (categoryInfo) {
    if (categoryInfo.category_path) {
      const pathParts = categoryInfo.category_path.split(' > ');
      categoryName = pathParts[0] || categoryInfo.category_name || category;
    } else {
      categoryName = categoryInfo.category_name || category;
    }
  }
  
  // 대분류 카테고리명으로 매칭 시도
  let keywords = baseDateKeywords[categoryName] || baseDateKeywords["기타"];
  
  // 카테고리명이 정확히 매칭되지 않으면 부분 매칭 시도
  if (keywords === baseDateKeywords["기타"]) {
    for (const [key, value] of Object.entries(baseDateKeywords)) {
      if (categoryName.includes(key) || key.includes(categoryName)) {
        keywords = value;
        break;
      }
    }
  }
  
  console.log('카테고리별 키워드 생성:', { category, categoryName, keywordCount: keywords.length });
  
  return keywords.map((keyword, index) => ({
    rank: index + 1,
    keyword,
    category: categoryName,
    categoryId: categoryInfo?.category_id || null,
    ratio: Math.floor(Math.random() * 100) + 1,
    monthlyPcSearchCount: Math.floor(Math.random() * 50000) + 10000,
    monthlyMobileSearchCount: Math.floor(Math.random() * 150000) + 30000,
    totalSearchCount: 0,
    monthlyAvgPcClick: Math.floor(Math.random() * 5000) + 500,
    monthlyAvgMobileClick: Math.floor(Math.random() * 15000) + 2000,
    totalAvgClick: 0,
    monthlyAvgPcCtr: Math.random() * 10 + 5,
    monthlyAvgMobileCtr: Math.random() * 15 + 5,
    avgCtr: 0,
    competition: Math.random() > 0.6 ? "높음" : Math.random() > 0.3 ? "중간" : "낮음",
    competitionScore: Math.floor(Math.random() * 100),
    plAvgDepth: Math.floor(Math.random() * 8) + 3
  }));
}

// extractPopularKeywords 함수는 더 이상 사용하지 않음 (주석 처리)
// function extractPopularKeywords(data: any, category: string, categoryInfo: any) {
//   // 실제 네이버 API 응답 구조에 맞게 키워드 추출
//   // 현재는 샘플 데이터 반환 (실제 API 응답 구조 확인 후 수정 필요)
//   return generateSampleKeywords(category, categoryInfo);
// }

