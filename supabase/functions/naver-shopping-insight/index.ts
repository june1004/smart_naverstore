
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
    const requestBody = await req.json();
    const { category, keyword, startDate, endDate, timeUnit = 'month', device = '', ages = [], gender = '', useKeywordAnalysis = false } = requestBody;
    
    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 카테고리 또는 키워드 중 하나는 반드시 필요
    if (!category && !keyword) {
      return new Response(JSON.stringify({ error: '카테고리 또는 키워드가 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let apiUrl = '';
    let requestPayload = {};

    if (useKeywordAnalysis && keyword) {
      // 키워드 기반 분석 (네이버 데이터랩 검색어 트렌드)
      apiUrl = 'https://openapi.naver.com/v1/datalab/search';
      requestPayload = {
        startDate,
        endDate,
        timeUnit,
        keywordGroups: [
          {
            groupName: keyword,
            keywords: [keyword]
          }
        ],
        device,
        ages,
        gender
      };
    } else if (category) {
      // 카테고리 기반 분석 (네이버 쇼핑인사이트)
      apiUrl = 'https://openapi.naver.com/v1/datalab/shopping/categories';
      requestPayload = {
        startDate,
        endDate,
        timeUnit,
        category,
        device,
        ages,
        gender
      };
    } else if (keyword) {
      // 키워드만 있을 경우 키워드 분석으로 기본 설정
      apiUrl = 'https://openapi.naver.com/v1/datalab/search';
      requestPayload = {
        startDate,
        endDate,
        timeUnit,
        keywordGroups: [
          {
            groupName: keyword,
            keywords: [keyword]
          }
        ],
        device,
        ages,
        gender
      };
    }

    console.log('API 요청:', { apiUrl, requestBody: requestPayload });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 응답 오류:', response.status, errorText);
      throw new Error(`네이버 API 오류: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API 응답 성공:', data);

    // 결과가 비어있는 경우 빈 배열로 기본 제공
    if (!data.results || data.results.length === 0) {
      data.results = [{ data: [] }];
    }

    // 데이터가 없는 경우 빈 배열로 초기화
    if (!data.results[0].data) {
      data.results[0].data = [];
    }

    return new Response(JSON.stringify({
      ...data,
      analysisType: useKeywordAnalysis ? 'keyword' : 'category',
      searchTerm: useKeywordAnalysis ? keyword : category
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('네이버 쇼핑인사이트 오류:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      results: [{ data: [] }]  // 에러가 발생해도 빈 데이터 구조를 반환
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
