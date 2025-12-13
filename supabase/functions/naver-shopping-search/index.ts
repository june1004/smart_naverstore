import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { keyword, display = 20, start = 1, sort = 'sim' } = await req.json();
    
    // 환경 변수에서 네이버 API 키 가져오기
    // @ts-ignore
    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    // @ts-ignore
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('API 키가 설정되지 않았습니다');
      return new Response(JSON.stringify({ 
        error: 'API 키가 설정되지 않았습니다. Supabase Secrets에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해주세요.' 
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

    // 트렌드/인사이트 API 비동기 호출
    const [trendData, shoppingInsight] = await Promise.all([
      fetchTrendData(keyword, clientId, clientSecret),
      fetchShoppingInsight(keyword, clientId, clientSecret)
    ]);

    console.log(`검색 완료: ${data.items?.length || 0}개 상품 찾음`);

    return new Response(JSON.stringify({
      ...data,
      items: analyzedItems,
      categoryAnalysis,
      competitorStats,
      trendData,
      shoppingInsight,
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
    const diff = ((now instanceof Date ? now.getTime() : now) - date.getTime()) / (1000 * 60 * 60 * 24); // days
    if (diff < 7) return 5;
    if (diff < 30) return 4;
    if (diff < 90) return 3;
    if (diff < 180) return 2;
    return 1;
  } catch {
    return 3;
  }
}

// 네이버 DataLab 통합검색어 트렌드 API 호출
async function fetchTrendData(keyword, clientId, clientSecret) {
  try {
    const url = 'https://openapi.naver.com/v1/datalab/search';
    const body = JSON.stringify({
      startDate: getPastDate(30),
      endDate: getToday(),
      timeUnit: 'date',
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
      device: 'pc',
      ages: [],
      gender: ''
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body
    });
    if (!res.ok) throw new Error('트렌드 API 오류');
    return await res.json();
  } catch (e) {
    console.error('트렌드 데이터 오류:', e);
    return null;
  }
}

// 네이버 DataLab 쇼핑인사이트 API 호출
async function fetchShoppingInsight(keyword, clientId, clientSecret) {
  try {
    const url = 'https://openapi.naver.com/v1/datalab/shopping/categories';
    const body = JSON.stringify({
      startDate: getPastDate(30),
      endDate: getToday(),
      timeUnit: 'date',
      category: [{ name: '패션의류', param: [keyword] }], // 예시: 실제 카테고리명/파라미터 조정 필요
      device: '',
      gender: '',
      ages: []
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body
    });
    if (!res.ok) throw new Error('쇼핑인사이트 API 오류');
    return await res.json();
  } catch (e) {
    console.error('쇼핑인사이트 데이터 오류:', e);
    return null;
  }
}

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function getPastDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
