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
    // 요청 본문 파싱 (에러 처리 포함)
    let keyword, startDate, endDate;
    try {
      const body = await req.json();
      keyword = body.keyword;
      startDate = body.startDate;
      endDate = body.endDate;
    } catch (parseError) {
      console.error('요청 본문 파싱 오류:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }), {
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

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: '시작일과 종료일이 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

    // 디버깅: API 키 존재 여부 확인 (보안을 위해 일부만 로깅)
    console.log('API 키 확인:', {
      hasClientId: !!clientId,
      clientIdLength: clientId?.length || 0,
      hasClientSecret: !!clientSecret,
      clientSecretLength: clientSecret?.length || 0,
      clientIdPrefix: clientId ? clientId.substring(0, 4) + '...' : 'N/A',
    });

    if (!clientId || !clientSecret) {
      console.error('API 키가 설정되지 않았습니다');
      return new Response(JSON.stringify({ 
        error: 'API 키가 설정되지 않았습니다. Supabase Secrets에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해주세요.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
    const formatDate = (dateStr: string) => {
      if (!dateStr) {
        throw new Error('날짜가 제공되지 않았습니다.');
      }
      if (dateStr.length === 8) {
        return dateStr;
      }
      return dateStr.replace(/-/g, '');
    };

    let formattedStartDate, formattedEndDate;
    try {
      formattedStartDate = formatDate(startDate);
      formattedEndDate = formatDate(endDate);
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

    const requestBody = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      timeUnit: 'date',
      keywordGroups: [{
        groupName: keyword,
        keywords: [keyword]
      }],
      device: '',
      ages: [],
      gender: ''
    };

    console.log('네이버 데이터랩 API 요청:', JSON.stringify(requestBody, null, 2));

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
      console.error('네이버 API 오류 응답:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      
      let errorMessage = `네이버 데이터랩 API 오류: ${response.status}`;
      if (response.status === 400) {
        errorMessage += ' - 요청 파라미터를 확인해주세요. 키워드는 2글자 이상이어야 하며, 날짜 범위는 최대 5년입니다.';
      } else if (response.status === 401) {
        errorMessage += ' - API 키가 올바르지 않거나 데이터랩 API 서비스가 활성화되지 않았습니다. 네이버 개발자 센터에서 API 키와 서비스 상태를 확인해주세요.';
      } else if (response.status === 403) {
        errorMessage += ' - API 사용 권한이 없습니다. 데이터랩 API 사용 권한이 활성화되어 있는지 확인해주세요.';
      } else if (response.status === 429) {
        errorMessage += ' - API 호출 한도를 초과했습니다.';
      }
      
      // 401 오류의 경우 더 자세한 정보 제공
      let errorDetails = errorText;
      if (response.status === 401) {
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = JSON.stringify(errorJson, null, 2);
        } catch {
          // JSON 파싱 실패시 원본 텍스트 사용
        }
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        statusCode: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('네이버 API 성공 응답:', JSON.stringify(data, null, 2));

    // 응답 데이터를 TrendData 형식으로 변환
    const trendData = [];
    if (data.results && data.results.length > 0 && data.results[0].data) {
      for (const item of data.results[0].data) {
        trendData.push({
          date: item.period,
          value: item.ratio || 0
        });
      }
    }

    return new Response(JSON.stringify(trendData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('트렌드 데이터 오류:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: '트렌드 데이터를 가져오는 중 오류가 발생했습니다.',
      stack: errorStack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

