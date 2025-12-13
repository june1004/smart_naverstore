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
    const { keyword, startDate, endDate } = await req.json();
    
    if (!keyword) {
      return new Response(JSON.stringify({ error: '키워드가 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
    const formatDate = (dateStr: string) => {
      if (dateStr.length === 8) {
        return dateStr;
      }
      return dateStr.replace(/-/g, '');
    };

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    const requestBody = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      timeUnit: 'week',
      keywordGroups: [{
        groupName: keyword,
        keywords: [keyword]
      }],
      device: '',
      ages: [],
      gender: ''
    };

    const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('네이버 API 오류:', errorText);
      throw new Error(`네이버 데이터랩 API 오류: ${response.status}`);
    }

    const data = await response.json();

    // 응답 데이터를 SearchTermData 형식으로 변환
    const searchTermData = [];
    if (data.results && data.results.length > 0 && data.results[0].data) {
      for (const item of data.results[0].data) {
        searchTermData.push({
          period: item.period,
          ratio: item.ratio || 0
        });
      }
    }

    return new Response(JSON.stringify(searchTermData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('검색어 데이터 오류:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: '검색어 데이터를 가져오는 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

