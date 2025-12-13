import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ProductGetRequest {
  originProductId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const body: ProductGetRequest = await req.json();
    const { originProductId } = body;

    if (!originProductId) {
      return new Response(JSON.stringify({ error: 'originProductId가 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 네이버 커머스 API 인증 정보
    const applicationId = Deno.env.get('NAVER_APPLICATION_ID');
    const applicationSecret = Deno.env.get('NAVER_APPLICATION_SECRET');

    if (!applicationId || !applicationSecret) {
      return new Response(JSON.stringify({ 
        error: '네이버 커머스 API 키가 설정되지 않았습니다. Supabase Secrets에 NAVER_APPLICATION_ID와 NAVER_APPLICATION_SECRET을 설정해주세요.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. OAuth 2.0 토큰 발급
    const tokenUrl = "https://api.commerce.naver.com/external/v1/oauth2/token";
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'client_credentials');
    tokenParams.append('client_id', applicationId);
    tokenParams.append('client_secret', applicationSecret);

    console.log('네이버 커머스 API 토큰 발급 요청');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('토큰 발급 실패:', tokenResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: `토큰 발급 실패: ${tokenResponse.status}`,
        details: errorText
      }), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response(JSON.stringify({ 
        error: '토큰 발급에 실패했습니다.',
        details: tokenData
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. 상품 정보 조회 API 호출
    // GET /external/v1/products/origin-products/{originProductId}
    const productUrl = `https://api.commerce.naver.com/external/v1/products/origin-products/${originProductId}`;
    
    console.log('상품 정보 조회 요청:', { originProductId });

    const productResponse = await fetch(productUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      console.error('상품 정보 조회 실패:', productResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: `상품 정보 조회 실패: ${productResponse.status}`,
        details: errorText
      }), {
        status: productResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productData = await productResponse.json();
    console.log('상품 정보 조회 성공:', { 
      productId: productData.id,
      productName: productData.name,
      hasCategory: !!productData.category,
      tagsCount: productData.tags?.length || 0
    });

    // 응답 데이터 정리
    const response = {
      originProductId: productData.id || originProductId,
      productName: productData.name || '',
      category: productData.category?.name || productData.categoryId || '',
      categoryPath: productData.category?.fullName || productData.categoryPath || '',
      tags: productData.tags || [],
      detailContent: productData.detailContent || '',
      images: productData.images || [],
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('상품 정보 조회 오류:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: '상품 정보를 조회하는 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

