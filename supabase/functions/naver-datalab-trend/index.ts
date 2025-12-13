
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
    const { keywords, startDate, endDate, timeUnit = 'month', device = '', ages = [], gender = '' } = await req.json();
    
    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('요청 파라미터:', { keywords, startDate, endDate, timeUnit });

    // 날짜 형식 검증 및 수정 (YYYY-MM-DD 형식으로 정규화)
    const formatDate = (dateStr: string) => {
      if (!dateStr) {
        throw new Error('날짜가 제공되지 않았습니다.');
      }
      
      // 이미 YYYY-MM-DD 형식인 경우
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      
      // YYYYMMDD 형식인 경우 YYYY-MM-DD로 변환
      if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
      }
      
      // Date 객체로 파싱 시도
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error(`잘못된 날짜 형식입니다: ${dateStr}`);
      }
      
      // YYYY-MM-DD 형식으로 반환
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let formattedStartDate, formattedEndDate;
    try {
      formattedStartDate = formatDate(startDate);
      formattedEndDate = formatDate(endDate);
      console.log('날짜 형식 변환:', { 
        original: { startDate, endDate },
        formatted: { formattedStartDate, formattedEndDate }
      });
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

    // 키워드 그룹 생성 - 각 키워드를 개별 그룹으로 처리
    const keywordGroups = keywords.map((keyword: string, index: number) => ({
      groupName: `그룹${index + 1}`,
      keywords: [keyword]
    }));

    const requestBody = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      timeUnit,
      keywordGroups,
      device,
      ages,
      gender
    };

    console.log('네이버 API 요청 본문:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('네이버 API 응답 상태:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('네이버 API 오류 응답:', errorText);
      
      let errorMessage = `네이버 데이터랩 API 오류: ${response.status}`;
      if (response.status === 400) {
        errorMessage += ' - 요청 파라미터를 확인해주세요. 키워드는 2글자 이상이어야 하며, 날짜 범위는 최대 5년입니다.';
      } else if (response.status === 401) {
        errorMessage += ' - API 키가 올바르지 않습니다.';
      } else if (response.status === 403) {
        errorMessage += ' - API 사용 권한이 없습니다.';
      } else if (response.status === 429) {
        errorMessage += ' - API 호출 한도를 초과했습니다.';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('네이버 API 성공 응답:', JSON.stringify(data, null, 2));

    // 응답 데이터 구조 변환 - 키워드별로 분리하여 반환
    if (data.results && Array.isArray(data.results)) {
      const transformedResults = data.results.map((result: any, index: number) => ({
        title: keywords[index],
        keywords: [keywords[index]],
        data: result.data || []
      }));
      
      return new Response(JSON.stringify({ results: transformedResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('네이버 데이터랩 트렌드 오류:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: '네이버 데이터랩 API 연동 중 오류가 발생했습니다. API 키와 요청 파라미터를 확인해주세요.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
