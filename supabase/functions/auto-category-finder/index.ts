
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 네이버 쇼핑 카테고리 매핑
const categoryMapping = {
  "패션의류": "50000000",
  "패션잡화": "50000001", 
  "화장품/미용": "50000002",
  "디지털/가전": "50000003",
  "가구/인테리어": "50000004",
  "출산/육아": "50000005",
  "식품": "50000006",
  "스포츠/레저": "50000007",
  "생활/건강": "50000008",
  "여가/생활편의": "50000009"
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

    // 1단계: 쇼핑 검색으로 카테고리 정보 수집
    const encodedKeyword = encodeURIComponent(keyword);
    const searchUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodedKeyword}&display=100&sort=sim`;

    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`네이버 검색 API 오류: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    // 2단계: 카테고리 분석 및 추천
    const categoryAnalysis = analyzeCategoriesFromItems(searchData.items);
    
    // 3단계: 추천된 카테고리로 인사이트 데이터 가져오기 (최근 6개월)
    const endDate = new Date().toISOString().slice(0, 7);
    const startDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);
    
    const insights = await Promise.all(
      categoryAnalysis.recommendedCategories.slice(0, 3).map(async (cat: any) => {
        try {
          const insightResponse = await fetch('https://openapi.naver.com/v1/datalab/shopping/categories', {
            method: 'POST',
            headers: {
              'X-Naver-Client-Id': clientId,
              'X-Naver-Client-Secret': clientSecret,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startDate,
              endDate,
              timeUnit: 'month',
              category: cat.code,
              device: '',
              ages: [],
              gender: ''
            }),
          });

          if (insightResponse.ok) {
            const insightData = await insightResponse.json();
            return {
              category: cat,
              insight: insightData
            };
          }
          return null;
        } catch (error) {
          console.error(`카테고리 ${cat.name} 인사이트 조회 실패:`, error);
          return null;
        }
      })
    );

    return new Response(JSON.stringify({
      keyword,
      categoryAnalysis,
      insights: insights.filter(Boolean)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('자동 카테고리 분석 오류:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeCategoriesFromItems(items: any[]) {
  const categoryCount = new Map();
  const categoryInfo = new Map();

  items.forEach(item => {
    if (item.category1) {
      const fullCategory = `${item.category1}>${item.category2 || ''}>${item.category3 || ''}`;
      const mainCategory = item.category1;
      
      categoryCount.set(fullCategory, (categoryCount.get(fullCategory) || 0) + 1);
      
      if (!categoryInfo.has(fullCategory)) {
        categoryInfo.set(fullCategory, {
          name: fullCategory,
          code: getCategoryCode(mainCategory),
          level1: item.category1,
          level2: item.category2 || '',
          level3: item.category3 || '',
          items: []
        });
      }
      
      categoryInfo.get(fullCategory).items.push(item);
    }
  });

  const sortedCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      ...categoryInfo.get(category),
      count,
      percentage: (count / items.length * 100).toFixed(1)
    }));

  return {
    totalItems: items.length,
    recommendedCategories: sortedCategories.slice(0, 5),
    allCategories: sortedCategories
  };
}

function getCategoryCode(categoryName: string): string {
  // 카테고리명을 기반으로 코드 매핑
  for (const [name, code] of Object.entries(categoryMapping)) {
    if (categoryName.includes(name) || name.includes(categoryName)) {
      return code;
    }
  }
  return "50000000"; // 기본값: 패션의류
}
