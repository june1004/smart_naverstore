import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 네이버 커머스 API 토큰 발급/갱신 함수
serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Secrets에서 커머스 API 키 가져오기
    const applicationId = Deno.env.get('NAVER_APPLICATION_ID');
    const applicationSecret = Deno.env.get('NAVER_APPLICATION_SECRET');

    if (!applicationId || !applicationSecret) {
      throw new Error('네이버 커머스 API 키(Application ID/Secret)가 설정되지 않았습니다.');
    }

    // 2. OAuth 2.0 토큰 발급 요청 (Client Credentials Grant)
    // https://api.commerce.naver.com/external/v1/oauth2/token
    const tokenUrl = "https://api.commerce.naver.com/external/v1/oauth2/token";
    
    // Client Credentials 방식 (서버 간 통신용)
    // grant_type=client_credentials&client_id={appId}&client_secret={appSecret}
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', applicationId);
    params.append('client_secret', applicationSecret);

    console.log('네이버 커머스 API 토큰 발급 요청:', applicationId);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('커머스 API 토큰 발급 실패:', response.status, errorText);
      throw new Error(`토큰 발급 실패: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();
    
    // 3. 발급된 토큰 반환
    return new Response(JSON.stringify(tokenData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in naver-commerce-auth:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

