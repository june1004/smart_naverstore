import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. 토큰 발급 (자체적으로 처리 또는 auth 함수 호출)
    const applicationId = Deno.env.get('NAVER_APPLICATION_ID');
    const applicationSecret = Deno.env.get('NAVER_APPLICATION_SECRET');

    if (!applicationId || !applicationSecret) {
      throw new Error('커머스 API 키가 설정되지 않았습니다.');
    }

    // 토큰 발급 요청
    const tokenResponse = await fetch("https://api.commerce.naver.com/external/v1/oauth2/token", {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: applicationId,
        client_secret: applicationSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('토큰 발급 실패');
    }

    const { access_token } = await tokenResponse.json();

    // 2. 상품 목록 조회 API 호출
    // https://api.commerce.naver.com/external/v1/products/search
    // 페이지네이션 파라미터 (기본값)
    const page = 1;
    const size = 50;
    
    const productResponse = await fetch(`https://api.commerce.naver.com/external/v1/products/search?page=${page}&size=${size}`, {
      method: 'POST', // 검색 API는 POST로 조건 전달 가능 (또는 GET 파라미터) - 문서 확인 필요. 여기서는 일반적인 GET/POST 중 POST 검색 예시
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // 검색 조건 (필요시 추가)
      })
    });
    
    // *참고: 네이버 커머스 API 스펙에 따라 GET/POST 및 파라미터가 다를 수 있음.
    // 일반적인 상품 목록 조회가 GET이라면 아래와 같이 변경:
    /*
    const productResponse = await fetch(`https://api.commerce.naver.com/external/v1/products/search?page=${page}&size=${size}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    */

    if (!productResponse.ok) {
        const errText = await productResponse.text();
        throw new Error(`상품 목록 조회 실패: ${errText}`);
    }

    const productData = await productResponse.json();

    return new Response(JSON.stringify(productData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

