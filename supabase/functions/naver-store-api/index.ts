import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;
    
    console.log(`[Naver Store API] Request received: ${method} ${url.pathname}`);
    
    // URL 쿼리 파라미터 로깅
    const queryParams = Object.fromEntries(url.searchParams);
    console.log(`[Naver Store API] Search Params:`, queryParams);

    // POST 요청인 경우 본문 확인
    let bodyData = null;
    if (method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      console.log(`[Naver Store API] Content-Type: ${contentType}`);

      try {
        if (contentType.includes('application/json')) {
          bodyData = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await req.formData();
          bodyData = Object.fromEntries(formData);
        } else {
          bodyData = await req.text();
        }
        console.log(`[Naver Store API] Body Data:`, bodyData);
      } catch (e) {
        console.error(`[Naver Store API] Failed to parse body:`, e);
      }
    }

    // 네이버 커머스 솔루션 연결/해지 알림 처리
    // 네이버는 일반적으로 JWT 형태의 데이터를 보낼 수 있음
    // 또는 OAuth2 인증 코드를 보낼 수도 있음 (솔루션 유형에 따라 다름)
    
    // 만약 JWT가 포함되어 있다면 (예: 'solution_token' 등)
    // 추후 공개키로 검증 로직 필요.
    
    return new Response(JSON.stringify({ 
      success: true,
      message: "Naver Store API Connection Endpoint Reached",
      receivedData: bodyData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[Naver Store API] Error:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

