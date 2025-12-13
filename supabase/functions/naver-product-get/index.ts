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
    // 요청 본문 파싱 (에러 처리 포함)
    let body: ProductGetRequest;
    try {
      body = await req.json();
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

    const { originProductId } = body;

    console.log('상품 정보 조회 요청 받음:', { originProductId });

    if (!originProductId || originProductId.trim() === '') {
      return new Response(JSON.stringify({ 
        error: 'originProductId가 필요합니다.',
        details: 'originProductId 필드는 필수이며 비어있을 수 없습니다.'
      }), {
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

    // 2. 상품 ID 식별 및 조회 전략
    // 사용자가 입력한 ID가 originProductId인지 channelProductId인지 알 수 없으므로,
    // 먼저 channelProductId로 검색하여 originProductId를 찾습니다.
    let targetOriginProductId = originProductId;
    let searchError = null;

    try {
      console.log('상품 ID 검색 시도 (ChannelProductId로 가정):', originProductId);
      
      const searchUrl = "https://api.commerce.naver.com/external/v1/products/search";
      const searchBody = {
        searchKeywordType: "CHANNEL_PRODUCT_ID",
        searchKeyword: originProductId,
        page: 1,
        size: 1
      };

      const searchResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody)
      });

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.contents && searchResult.contents.length > 0) {
          const foundProduct = searchResult.contents[0];
          console.log('상품 검색 성공:', {
            channelProductId: foundProduct.channelProducts?.[0]?.channelProductId,
            originProductId: foundProduct.originProduct?.id
          });
          
          if (foundProduct.originProduct?.id) {
            targetOriginProductId = foundProduct.originProduct.id;
          }
        } else {
          console.log('검색 결과 없음. 입력된 ID를 originProductId로 간주합니다.');
        }
      } else {
        const errorText = await searchResponse.text();
        console.warn('상품 검색 실패 (무시하고 진행):', searchResponse.status, errorText);
        searchError = errorText;
      }
    } catch (e) {
      console.warn('상품 검색 중 예외 발생 (무시하고 진행):', e);
    }

    // 3. 상품 상세 정보 조회 API 호출
    // GET /external/v1/products/origin-products/{originProductId}
    const productUrl = `https://api.commerce.naver.com/external/v1/products/origin-products/${targetOriginProductId}`;
    
    console.log('상품 상세 정보 조회 요청:', { targetOriginProductId });

    const productResponse = await fetch(productUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      console.error('상품 정보 조회 실패:', productResponse.status, errorDetails);
      
      // 400 에러인 경우 상세 정보 제공
      if (productResponse.status === 400) {
        return new Response(JSON.stringify({ 
          error: '상품 정보 조회 요청 오류',
          details: errorDetails?.message || errorDetails?.error || errorText,
          suggestion: '상품ID가 올바른지 확인하거나, 네이버 커머스 API 문서를 확인해주세요.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `상품 정보 조회 실패: ${productResponse.status}`,
        details: errorDetails?.message || errorDetails?.error || errorText
      }), {
        status: productResponse.status >= 500 ? 500 : productResponse.status,
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

