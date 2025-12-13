import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

interface ProductUpdateRequest {
  originProductId: string;
  product: {
    name: string;
    detailContent: string;
    tags: string[];
    images?: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const body: ProductUpdateRequest = await req.json();
    const { originProductId, product } = body;

    if (!originProductId) {
      return new Response(JSON.stringify({ error: 'originProductId가 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!product || !product.name || !product.detailContent) {
      return new Response(JSON.stringify({ error: '상품 정보(name, detailContent)가 필요합니다.' }), {
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

    // 2. 상품 정보 업데이트 API 호출
    // PUT /external/v1/products/origin-products/{originProductId}
    const updateUrl = `https://api.commerce.naver.com/external/v1/products/origin-products/${originProductId}`;
    
    // 네이버 커머스 API 요청 본문 구성
    const updateBody = {
      name: product.name,
      detailContent: product.detailContent,
      tags: product.tags || [],
      // images는 기존 이미지 유지하거나 필요시 업데이트
      ...(product.images && { images: product.images }),
    };

    console.log('상품 업데이트 요청:', { originProductId, updateBody: { ...updateBody, detailContent: updateBody.detailContent.substring(0, 100) + '...' } });

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateBody),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('상품 업데이트 실패:', updateResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: `상품 업데이트 실패: ${updateResponse.status}`,
        details: errorText
      }), {
        status: updateResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updateResult = await updateResponse.json();
    console.log('상품 업데이트 성공:', updateResult);

    return new Response(JSON.stringify({
      success: true,
      message: '상품 정보가 성공적으로 업데이트되었습니다.',
      data: updateResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('상품 업데이트 오류:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: '상품 업데이트 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

