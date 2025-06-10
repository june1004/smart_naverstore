
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword } = await req.json();
    
    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 네이버 쇼핑 검색으로 키워드의 카테고리 정보 수집
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodedKeyword}&display=100&start=1&sort=sim`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`네이버 API 오류: ${response.status}`);
    }

    const data = await response.json();
    
    // 카테고리 분석
    const categoryAnalysis = analyzeCategoryFromItems(data.items);
    
    // 가장 적합한 카테고리 찾기 (키워드 기반 분석도 지원)
    const bestCategory = findBestCategoryMatch(categoryAnalysis, keyword);

    return new Response(JSON.stringify({
      keyword,
      suggestedCategory: bestCategory,
      categoryAnalysis,
      totalItems: data.total,
      useKeywordAnalysis: bestCategory === null // 카테고리를 찾지 못한 경우 키워드 분석 사용
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('카테고리 자동 찾기 오류:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeCategoryFromItems(items: any[]) {
  const categoryMap = new Map();
  
  items.forEach(item => {
    if (item.category1) {
      const key = `${item.category1}>${item.category2 || ''}>${item.category3 || ''}`;
      categoryMap.set(key, (categoryMap.get(key) || 0) + 1);
    }
  });

  const sortedCategories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    mainCategory: sortedCategories[0] || null,
    allCategories: sortedCategories
  };
}

function findBestCategoryMatch(categoryAnalysis: any, keyword: string) {
  // 네이버 쇼핑인사이트에서 지원하는 주요 카테고리 ID들
  const categoryMapping: { [key: string]: string } = {
    '패션의류': '50000000',
    '패션잡화': '50000001', 
    '화장품/미용': '50000002',
    '디지털/가전': '50000003',
    '가구/인테리어': '50000004',
    '출산/육아': '50000005',
    '식품': '50000006',
    '스포츠/레저': '50000007',
    '생활/건강': '50000008',
    '여가/생활편의': '50000009'
  };

  if (!categoryAnalysis.mainCategory) return null;

  const mainCategoryText = categoryAnalysis.mainCategory[0];
  
  // 직접 매칭 시도
  for (const [categoryName, categoryId] of Object.entries(categoryMapping)) {
    if (mainCategoryText.includes(categoryName.split('/')[0])) {
      return categoryId;
    }
  }

  // 키워드 기반 매칭
  const keywordMappings: { [key: string]: string } = {
    '옷': '50000000',
    '의류': '50000000',
    '가방': '50000001',
    '신발': '50000001',
    '화장품': '50000002',
    '스킨케어': '50000002',
    '휴대폰': '50000003',
    '컴퓨터': '50000003',
    '가전': '50000003',
    '가구': '50000004',
    '침대': '50000004',
    '육아': '50000005',
    '기저귀': '50000005',
    '음식': '50000006',
    '식품': '50000006',
    '운동': '50000007',
    '스포츠': '50000007',
    '건강': '50000008',
    '생활': '50000008'
  };

  for (const [keywordPattern, categoryId] of Object.entries(keywordMappings)) {
    if (keyword.includes(keywordPattern) || mainCategoryText.includes(keywordPattern)) {
      return categoryId;
    }
  }

  return null; // 매칭되는 카테고리가 없으면 키워드 분석 사용
}
