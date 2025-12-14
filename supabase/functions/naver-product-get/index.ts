import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Deno 호환성 문제(Worker is not defined) 해결을 위해 npm 패키지 사용 또는 다른 구현체 사용
// npm:bcryptjs는 순수 JS 구현체라 호환성이 좋음
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// 네이버 커머스 API 서명 생성 함수
async function generateSignature(clientId: string, clientSecret: string, timestamp: number) {
  const password = `${clientId}${timestamp}`;
  // bcryptjs는 동기 함수만 제공하거나 비동기 방식이 다를 수 있음
  // bcryptjs.hash(s, salt, callback) or bcryptjs.hashSync(s, salt)
  // 네이버 API는 client_secret을 사용하여 해시를 생성해야 함.
  // bcryptjs.hash(password, clientSecret) -> clientSecret이 유효한 salt 형식이어야 함.
  // 하지만 clientSecret은 base64 문자열 등일 수 있어 salt 형식이 아닐 수 있음.
  // 이 경우 네이버 API가 요구하는 것이 정확히 무엇인지가 중요함.
  
  // 네이버 커머스 API Java 예제 코드를 보면:
  // BCrypt.hashpw(password, clientSecret) 을 사용함.
  // 이는 clientSecret을 salt로 사용한다는 의미임.
  // 하지만 bcryptjs에서 salt는 특정 포맷($2a$...)을 따라야 함.
  // 만약 clientSecret이 표준 salt 포맷이 아니라면 에러가 날 것임.
  
  // 만약 clientSecret이 표준 salt 포맷이 아니라면, 
  // 네이버 API의 clientSecret 자체가 이미 bcrypt salt 포맷일 가능성이 높음.
  // (실제로 네이버 커머스 API의 clientSecret은 $2a$로 시작하는 bcrypt hash string인 경우가 많음)
  
  return bcrypt.hashSync(password, clientSecret);
}

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

    console.log('API Key 확인:', { 
      applicationId, 
      secretLength: applicationSecret?.length,
      secretPrefix: applicationSecret?.substring(0, 4) // $2a$ 확인용
    });

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
    const timestamp = Date.now(); // 밀리초 단위 (13자리)
    
    // 서명 생성
    // 네이버 커머스 API에서 client_secret은 bcrypt salt 형식을 따름 ($2a$...)
    // 따라서 bcrypt.hashSync(password, salt)를 바로 사용할 수 있음.
    // npm:bcryptjs는 순수 JS라 Edge Runtime에서 문제 없음.
    
    // 참고: timestamp 유효 시간은 5분(300초) 이내여야 함.
    // 서버 시간 동기화 문제로 인한 에러 가능성도 있으나 일단 진행.
    
    // 전자서명 생성
    // 네이버 커머스 OAuth2 토큰 발급은 보통 client_id + "_" + timestamp 문자열을 bcrypt(clientSecret salt)로 서명합니다.
    // (문서: [네이버 커머스 API 개발 가이드](https://apicenter.commerce.naver.com/ko/basic/solution-doc#section/%EA%B0%9C%EB%B0%9C%ED%95%98%EA%B8%B0))
    const cleanedSecret = applicationSecret.trim().replace(/\u200B|\u200C|\u200D|\uFEFF/g, '');
    const signaturePassword = `${applicationId}_${timestamp}`;
    let signature;
    try {
      // Secret 값 디버깅 (로그에는 전체 노출 금지)
      if (!cleanedSecret.startsWith('$2a$')) {
        console.error('Invalid Secret Format:', cleanedSecret.substring(0, 5));
        throw new Error(`Invalid Secret Format: ${cleanedSecret.substring(0, 5)}...`);
      }
      
      console.log('서명 생성 시도:', { 
        password: signaturePassword, 
        secretLength: cleanedSecret.length,
        secretPrefix: cleanedSecret.substring(0, 7)
      });

      // bcryptjs는 Promise 기반 hash()가 없고, 주로 hashSync()를 사용합니다.
      // cleanedSecret(29자 salt)이 유효하면 정상 동작합니다.
      signature = bcrypt.hashSync(signaturePassword, cleanedSecret);
      
    } catch (e) {
      console.error('서명 생성 실패:', e);
      return new Response(JSON.stringify({ 
        error: '서명 생성 실패',
        details: `서명 생성 중 오류가 발생했습니다. Secret 길이: ${cleanedSecret?.length}, 에러: ${e?.message ?? e}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', applicationId);
    tokenParams.append('timestamp', timestamp.toString());
    tokenParams.append('grant_type', 'client_credentials');
    tokenParams.append('client_secret_sign', signature);
    // 솔루션 ID가 있으면 SOLUTION, 아니면 SELF로 처리
    const solutionId = Deno.env.get('NAVER_SOLUTION_ID')?.trim();
    tokenParams.append('type', solutionId ? 'SOLUTION' : 'SELF');


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
    let searchDebugInfo: any = {};

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
        searchDebugInfo.result = searchResult;
        
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
          searchDebugInfo.message = '검색 결과 없음';
          console.log('검색 결과 없음. 입력된 ID를 originProductId로 간주합니다.');
        }
      } else {
        const errorText = await searchResponse.text();
        let errorJson;
        try { errorJson = JSON.parse(errorText); } catch {}
        
        searchDebugInfo.error = errorJson || errorText;
        searchDebugInfo.status = searchResponse.status;
        
        console.warn('상품 검색 실패 (무시하고 진행):', searchResponse.status, errorText);
      }
    } catch (e) {
      searchDebugInfo.exception = e instanceof Error ? e.message : 'Unknown error';
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
          searchDebugInfo: searchDebugInfo,
          suggestion: '상품ID가 올바른지 확인하거나, 네이버 커머스 API 문서를 확인해주세요. (본인 소유의 상품만 조회 가능)'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `상품 정보 조회 실패: ${productResponse.status}`,
        details: errorDetails?.message || errorDetails?.error || errorText,
        searchDebugInfo: searchDebugInfo
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

