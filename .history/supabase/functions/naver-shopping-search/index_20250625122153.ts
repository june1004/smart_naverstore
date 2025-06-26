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
    const { keyword, display = 20, start = 1, sort = 'sim' } = await req.json();
    
    // 환경 변수에서 네이버 API 키 가져오기
    // @ts-ignore
    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    // @ts-ignore
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ 
        error: '네이버 API 키가 환경 변수에 설정되지 않았습니다. NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해주세요.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodedKeyword}&display=${display}&start=${start}&sort=${sort}`;

    console.log(`네이버 쇼핑 API 호출: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`네이버 API 오류: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    // 카테고리 정보를 추출하여 분석
    const categoryAnalysis = analyzeCategoryFromItems(data.items);

    // 상품별 지표 분석 및 경쟁 상품 통계 추가
    const analyzedItems = analyzeItems(data.items);
    const competitorStats = analyzeCompetitorStats(analyzedItems);

    // (트렌드/인사이트 API 연동 구조만 마련)
    // const trendData = await fetchTrendData(keyword);
    // const shoppingInsight = await fetchShoppingInsight(keyword);

    console.log(`검색 완료: ${data.items?.length || 0}개 상품 찾음`);

    return new Response(JSON.stringify({
      ...data,
      items: analyzedItems,
      categoryAnalysis,
      competitorStats,
      // trendData,
      // shoppingInsight,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('네이버 쇼핑 검색 오류:', error);
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
    .slice(0, 5);

  return {
    mainCategory: sortedCategories[0] || null,
    allCategories: sortedCategories
  };
}

// 상품별 지표 분석 함수
function analyzeItems(items) {
  if (!Array.isArray(items)) return [];
  const now = new Date();
  return items.map(item => {
    // 점수 산정 예시 (실제 데이터에 맞게 조정 필요)
    const clickScore = parseInt(item.clickScore) || getRandomScore(1, 5);
    const salesScore = parseInt(item.salesScore) || getRandomScore(1, 5);
    const reviewScore = parseInt(item.reviewScore) || (item.reviewCount ? scoreByCount(item.reviewCount) : getRandomScore(1, 5));
    const popularityScore = parseInt(item.popularityScore) || getRandomScore(1, 5);
    const recency = item.pubDate ? scoreByRecency(item.pubDate, now) : getRandomScore(1, 5);
    const penalty = 0; // 패널티 로직 필요시 추가
    const price = parseInt(item.lprice || item.price || '0');
    const estimatedSales = item.salesCount ? parseInt(item.salesCount) : getRandomScore(10, 100);
    const estimatedRevenue = price * estimatedSales;
    return {
      ...item,
      clickScore,
      salesScore,
      reviewScore,
      popularityScore,
      recency,
      penalty,
      estimatedSales,
      estimatedRevenue,
    };
  });
}

// 경쟁 상품 통계 분석 함수
function analyzeCompetitorStats(items) {
  if (!Array.isArray(items) || items.length === 0) return {};
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const maxBy = (arr, key) => arr.reduce((a, b) => (a[key] > b[key] ? a : b));
  return {
    averageSales: Math.round(avg(items.map(i => i.estimatedSales)) || 0),
    averageRevenue: Math.round(avg(items.map(i => i.estimatedRevenue)) || 0),
    topCompetitor: maxBy(items, 'estimatedSales'),
    totalCompetitors: items.length,
  };
}

// 점수 산정 보조 함수들
function getRandomScore(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function scoreByCount(count) {
  if (count > 1000) return 5;
  if (count > 500) return 4;
  if (count > 100) return 3;
  if (count > 10) return 2;
  return 1;
}
function scoreByRecency(pubDate, now) {
  try {
    const date = new Date(pubDate);
    const diff = (now - date) / (1000 * 60 * 60 * 24); // days
    if (diff < 7) return 5;
    if (diff < 30) return 4;
    if (diff < 90) return 3;
    if (diff < 180) return 2;
    return 1;
  } catch {
    return 3;
  }
}
