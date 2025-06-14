
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

    // 날짜 형식 검증 및 수정
    const formatDate = (dateStr: string) => {
      // YYYYMMDD 형식으로 변환
      const date = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
      if (isNaN(date.getTime())) {
        throw new Error('잘못된 날짜 형식입니다.');
      }
      return dateStr;
    };

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    // 키워드 그룹 생성 - 각 키워드를 개별 그룹으로 처리
    const keywordGroups = keywords.map((keyword: string, index: number) => ({
      groupName: keyword, // 키워드명을 그룹명으로 사용
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
      
      // 더 자세한 오류 메시지 제공
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
