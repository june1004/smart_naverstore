
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // 요청 본문 파싱 (에러 처리 포함)
    let keyword;
    try {
      const body = await req.json();
      keyword = body.keyword;
    } catch (parseError) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!keyword) {
      return new Response(JSON.stringify({ error: '키워드가 필요합니다.' }), {
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

    // 1. 네이버 쇼핑 검색으로 키워드의 카테고리 정보 수집
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

    const shoppingData = await response.json();
    
    // 2. 실제 카테고리 데이터베이스에서 카테고리 정보 조회
    const { data: dbCategories } = await supabase
      .from('naver_categories')
      .select('*')
      .eq('is_active', true);

    // 3. 카테고리 분석 (실제 DB와 매칭)
    const categoryAnalysis = analyzeCategoryFromItemsWithDB(shoppingData.items, dbCategories || []);
    
    // 4. 12개월 검색 트렌드 데이터 수집
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);
    
    const trendResponse = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`,
        endDate: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
        timeUnit: 'month',
        keywordGroups: [
          {
            groupName: keyword,
            keywords: [keyword]
          }
        ]
      }),
    });

    let trendData = [];
    if (trendResponse.ok) {
      const trendResult = await trendResponse.json();
      trendData = trendResult.results?.[0]?.data || [];
    }

    // 5. 인사이트 데이터 수집 (카테고리 기반)
    const bestCategory = findBestCategoryMatch(categoryAnalysis, keyword, dbCategories);
    let insightData = [];
    
    if (bestCategory) {
      const insightResponse = await fetch('https://openapi.naver.com/v1/datalab/shopping/categories', {
        method: 'POST',
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`,
          endDate: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
          timeUnit: 'month',
          category: bestCategory
        }),
      });

      if (insightResponse.ok) {
        const insightResult = await insightResponse.json();
        insightData = insightResult.results?.[0]?.data || [];
      }
    }

    // 6. 가격대별 분석 (쇼핑 데이터에서 추출)
    const priceAnalysis = analyzePriceRange(shoppingData.items);

    return new Response(JSON.stringify({
      keyword,
      categoryAnalysis: {
        totalItems: shoppingData.total,
        recommendedCategories: categoryAnalysis.allCategories.slice(0, 10).map(([cat, count, dbCategory]) => {
          const pathParts = dbCategory?.category_path?.split(' > ') || cat.split('>');
          const percentage = ((count / shoppingData.items.length) * 100).toFixed(1);
          return {
            name: dbCategory?.category_path || cat,
            code: dbCategory?.category_id || 'N/A',
            level1: pathParts[0] || cat.split('>')[0] || '',
            level2: pathParts[1] || cat.split('>')[1] || '',
            level3: pathParts[2] || cat.split('>')[2] || '',
            count,
            percentage,
            hasRealCategory: !!dbCategory,
            realCategoryId: dbCategory?.category_id,
            realCategoryPath: dbCategory?.category_path
          };
        })
      },
      insights: [{
        category: {
          name: categoryAnalysis.mainCategory?.[0] || keyword,
          code: bestCategory || 'N/A',
          level1: categoryAnalysis.mainCategory?.[0]?.split('>')[0] || keyword,
          level2: categoryAnalysis.mainCategory?.[0]?.split('>')[1] || '',
          level3: categoryAnalysis.mainCategory?.[0]?.split('>')[2] || '',
          count: categoryAnalysis.mainCategory?.[1] || 0,
          percentage: categoryAnalysis.mainCategory ? ((categoryAnalysis.mainCategory[1] / shoppingData.items.length) * 100).toFixed(1) : '0'
        },
        insight: {
          title: `${keyword} 월별 검색량 추이`,
          results: [{
            title: '12개월 검색 트렌드',
            data: trendData
          }]
        }
      }],
      monthlySearchStats: {
        keyword,
        monthlyData: trendData,
        competitiveness: calculateCompetitiveness(trendData),
        validity: calculateValidity(trendData)
      },
      priceAnalysis,
      clickTrends: insightData,
      demographicAnalysis: generateDemographicAnalysis(keyword)
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

function analyzeCategoryFromItemsWithDB(items: any[], dbCategories: any[]) {
  const categoryMap = new Map();
  
  items.forEach(item => {
    if (item.category1) {
      // 네이버 쇼핑 API의 카테고리 구조와 DB 카테고리 매칭
      const level1 = item.category1?.trim();
      const level2 = item.category2?.trim();
      const level3 = item.category3?.trim();
      
      // 대/중/소 분류에 따라 적절한 카테고리 ID 찾기
      let matchedCategory = findBestMatchingCategory(level1, level2, level3, dbCategories);
      
      // 카테고리 경로 생성
      const pathParts = [level1, level2, level3].filter(Boolean);
      const categoryPath = pathParts.join(' > ');
      
      const key = matchedCategory?.category_path || categoryPath;
      const existing = categoryMap.get(key) || [key, 0, matchedCategory];
      categoryMap.set(key, [key, existing[1] + 1, matchedCategory]);
    }
  });

  const sortedCategories = Array.from(categoryMap.values())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    mainCategory: sortedCategories[0] || null,
    allCategories: sortedCategories
  };
}

function findBestMatchingCategory(level1: string, level2: string, level3: string, dbCategories: any[]) {
  // 1. 소분류가 있으면 소분류로 매칭 시도 (가장 구체적)
  if (level3) {
    const level3Match = dbCategories.find(cat => {
      if (!cat.category_path) return false;
      const pathParts = cat.category_path.split(' > ');
      return pathParts.length === 3 && 
             pathParts[0] === level1 && 
             pathParts[1] === level2 && 
             pathParts[2] === level3;
    });
    if (level3Match) return level3Match;
    
    // 소분류 직접 매칭
    const directLevel3Match = dbCategories.find(cat => 
      cat.category_name === level3 && cat.category_level === 3
    );
    if (directLevel3Match) return directLevel3Match;
  }
  
  // 2. 중분류로 매칭 시도
  if (level2) {
    const level2Match = dbCategories.find(cat => {
      if (!cat.category_path) return false;
      const pathParts = cat.category_path.split(' > ');
      return pathParts.length === 2 && 
             pathParts[0] === level1 && 
             pathParts[1] === level2;
    });
    if (level2Match) return level2Match;
    
    // 중분류 직접 매칭
    const directLevel2Match = dbCategories.find(cat => 
      cat.category_name === level2 && cat.category_level === 2
    );
    if (directLevel2Match) return directLevel2Match;
  }
  
  // 3. 대분류로 매칭 시도
  if (level1) {
    const level1Match = dbCategories.find(cat => {
      if (!cat.category_path) return false;
      const pathParts = cat.category_path.split(' > ');
      return pathParts.length === 1 && pathParts[0] === level1;
    });
    if (level1Match) return level1Match;
    
    // 대분류 직접 매칭
    const directLevel1Match = dbCategories.find(cat => 
      cat.category_name === level1 && cat.category_level === 1
    );
    if (directLevel1Match) return directLevel1Match;
  }
  
  return null;
}

function analyzePriceRange(items: any[]) {
  const priceRanges = {
    '1만원 미만': 0,
    '1-3만원': 0,
    '3-5만원': 0,
    '5-10만원': 0,
    '10만원 이상': 0
  };

  items.forEach(item => {
    const price = parseInt(item.lprice?.replace(/,/g, '') || '0');
    if (price < 10000) priceRanges['1만원 미만']++;
    else if (price < 30000) priceRanges['1-3만원']++;
    else if (price < 50000) priceRanges['3-5만원']++;
    else if (price < 100000) priceRanges['5-10만원']++;
    else priceRanges['10만원 이상']++;
  });

  return Object.entries(priceRanges).map(([range, count]) => ({
    range,
    count,
    percentage: ((count / items.length) * 100).toFixed(1)
  }));
}

function calculateCompetitiveness(trendData: any[]) {
  if (!trendData.length) return 'N/A';
  
  const avgRatio = trendData.reduce((sum, item) => sum + item.ratio, 0) / trendData.length;
  const variance = trendData.reduce((sum, item) => sum + Math.pow(item.ratio - avgRatio, 2), 0) / trendData.length;
  
  if (avgRatio > 80) return '높음';
  if (avgRatio > 50) return '보통';
  return '낮음';
}

function calculateValidity(trendData: any[]) {
  if (!trendData.length) return 'N/A';
  
  const hasConsistentData = trendData.filter(item => item.ratio > 0).length >= 8;
  return hasConsistentData ? '유효' : '검증 필요';
}

function generateDemographicAnalysis(keyword: string) {
  // 실제로는 네이버 API에서 받아와야 하지만, 샘플 데이터로 제공
  return {
    age: [
      { range: '10대', percentage: 15 },
      { range: '20대', percentage: 35 },
      { range: '30대', percentage: 30 },
      { range: '40대', percentage: 15 },
      { range: '50대+', percentage: 5 }
    ],
    gender: [
      { type: '여성', percentage: 60 },
      { type: '남성', percentage: 40 }
    ],
    device: [
      { type: '모바일', percentage: 75 },
      { type: 'PC', percentage: 25 }
    ]
  };
}

function findBestCategoryMatch(categoryAnalysis: any, keyword: string, dbCategories: any[]) {
  if (!categoryAnalysis.mainCategory) return null;

  const mainCategoryData = categoryAnalysis.mainCategory[2]; // DB 카테고리 정보
  if (mainCategoryData && mainCategoryData.category_id) {
    return mainCategoryData.category_id;
  }

  return null;
}
