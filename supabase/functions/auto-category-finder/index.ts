
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
    
    // 2. 카테고리 분석
    const categoryAnalysis = analyzeCategoryFromItems(shoppingData.items);
    
    // 3. 12개월 검색 트렌드 데이터 수집
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

    // 4. 인사이트 데이터 수집 (카테고리 기반)
    const bestCategory = findBestCategoryMatch(categoryAnalysis, keyword);
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

    // 5. 가격대별 분석 (쇼핑 데이터에서 추출)
    const priceAnalysis = analyzePriceRange(shoppingData.items);

    return new Response(JSON.stringify({
      keyword,
      categoryAnalysis: {
        totalItems: shoppingData.total,
        recommendedCategories: categoryAnalysis.allCategories.slice(0, 10).map(([cat, count]) => {
          const [level1, level2, level3] = cat.split('>');
          const percentage = ((count / shoppingData.items.length) * 100).toFixed(1);
          return {
            name: cat,
            code: findBestCategoryMatch({ allCategories: [[cat, count]] }, keyword) || 'N/A',
            level1: level1 || cat,
            level2: level2 || '',
            level3: level3 || '',
            count,
            percentage
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

function findBestCategoryMatch(categoryAnalysis: any, keyword: string) {
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
  
  for (const [categoryName, categoryId] of Object.entries(categoryMapping)) {
    if (mainCategoryText.includes(categoryName.split('/')[0])) {
      return categoryId;
    }
  }

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

  return null;
}
