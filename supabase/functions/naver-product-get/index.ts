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

type TokenAttempt = {
  name: string;
  clientId: string;
  type: 'SELF' | 'SOLUTION';
  timestamp: string; // 그대로 전송되는 timestamp 문자열
  signaturePassword: string;
  extraParams?: Record<string, string>;
};

function base64EncodeAscii(input: string) {
  // bcrypt 결과는 ASCII 범위 문자열이라 btoa로 안전하게 인코딩 가능
  return btoa(input);
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
    const nowMs = Date.now();
    const tsMs = String(nowMs); // 13자리 (밀리초) - 문서 예시도 밀리초 사용
    const tsSec = String(Math.floor(nowMs / 1000)); // 10자리 (초) - 일부 구현체 대비 fallback
    
    // 서명 생성
    // 네이버 커머스 API에서 client_secret은 bcrypt salt 형식을 따름 ($2a$...)
    // 따라서 bcrypt.hashSync(password, salt)를 바로 사용할 수 있음.
    // npm:bcryptjs는 순수 JS라 Edge Runtime에서 문제 없음.
    
    // 참고: timestamp 유효 시간은 5분(300초) 이내여야 함.
    // 서버 시간 동기화 문제로 인한 에러 가능성도 있으나 일단 진행.
    
    // 전자서명 + 토큰 발급: 문서/계정 타입 차이로 파라미터 조합이 달라질 수 있어 여러 조합을 순차적으로 시도합니다.
    // 참고: [네이버 커머스 API 개발 가이드](https://apicenter.commerce.naver.com/ko/basic/solution-doc#section/%EA%B0%9C%EB%B0%9C%ED%95%98%EA%B8%B0)
    const cleanedSecret = applicationSecret.trim().replace(/\u200B|\u200C|\u200D|\uFEFF/g, '');
    const solutionId = Deno.env.get('NAVER_SOLUTION_ID')?.trim();

    if (!cleanedSecret.startsWith('$2a$')) {
      return new Response(JSON.stringify({
        error: '네이버 커머스 API secret 형식이 올바르지 않습니다.',
        details: `secret prefix=${cleanedSecret.substring(0, 5)}, length=${cleanedSecret.length}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 토큰은 type + account_id 조합으로 발급/캐시된다고 문서에 명시됩니다.
    // 따라서 account_id(판매자/계정 식별자)가 필요할 수 있습니다.
    // 문서: https://apicenter.commerce.naver.com/docs/auth (전자서명/토큰 발급)
    const accountId = Deno.env.get('NAVER_ACCOUNT_ID')?.trim();

    const attempts: TokenAttempt[] = [
      {
        name: 'SELF + ms + client_id=appId + base64(sign)',
        clientId: applicationId,
        type: 'SELF',
        timestamp: tsMs,
        signaturePassword: `${applicationId}_${tsMs}`,
      },
      {
        name: 'SELF + sec + client_id=appId + base64(sign)',
        clientId: applicationId,
        type: 'SELF',
        timestamp: tsSec,
        signaturePassword: `${applicationId}_${tsSec}`,
      },
    ];

    if (solutionId) {
      // 솔루션 계정일 때 흔히 시도하는 조합들
      attempts.push(
        {
          name: 'SOLUTION + ms + client_id=appId + base64(sign) + solutionId param',
          clientId: applicationId,
          type: 'SOLUTION',
          timestamp: tsMs,
          signaturePassword: `${applicationId}_${tsMs}`,
          extraParams: { solutionId },
        },
        {
          name: 'SOLUTION + sec + client_id=appId + base64(sign) + solutionId param',
          clientId: applicationId,
          type: 'SOLUTION',
          timestamp: tsSec,
          signaturePassword: `${applicationId}_${tsSec}`,
          extraParams: { solutionId },
        },
        {
          name: 'SOLUTION + ms + client_id=solutionId + base64(sign)',
          clientId: solutionId,
          type: 'SOLUTION',
          timestamp: tsMs,
          signaturePassword: `${solutionId}_${tsMs}`,
        },
        {
          name: 'SOLUTION + sec + client_id=solutionId + base64(sign)',
          clientId: solutionId,
          type: 'SOLUTION',
          timestamp: tsSec,
          signaturePassword: `${solutionId}_${tsSec}`,
        }
      );
    }

    const attemptLogs: Array<{ name: string; status: number; body: unknown }> = [];
    let tokenData: any = null;
    let tokenError: { status: number; body: unknown } | null = null;

    for (const attempt of attempts) {
      try {
        // 문서: bcrypt 해싱 결과를 Base64 인코딩 후 전달
        // (전자서명 생성 방법: password = client_id + "_" + timestamp, salt = client_secret, then Base64 encoding)
        const signatureRaw = bcrypt.hashSync(attempt.signaturePassword, cleanedSecret);
        const signature = base64EncodeAscii(signatureRaw);

        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'client_credentials');
        tokenParams.append('client_id', attempt.clientId);
        tokenParams.append('timestamp', attempt.timestamp);
        tokenParams.append('client_secret_sign', signature);
        tokenParams.append('type', attempt.type);
        // account_id는 문서에서 동일 리소스 키로 언급됩니다. 제공되면 항상 포함합니다.
        if (accountId) tokenParams.append('account_id', accountId);
        if (attempt.extraParams) {
          for (const [k, v] of Object.entries(attempt.extraParams)) {
            tokenParams.append(k, v);
          }
        }

        console.log('네이버 커머스 API 토큰 발급 요청 시도:', {
          attempt: attempt.name,
          type: attempt.type,
          clientIdPrefix: attempt.clientId.substring(0, 4),
          timestampDigits: attempt.timestamp.length,
        });

        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams,
        });

        const text = await res.text();
        let body: unknown = text;
        try {
          body = JSON.parse(text);
        } catch {
          // ignore
        }

        attemptLogs.push({ name: attempt.name, status: res.status, body });

        if (res.ok) {
          tokenData = body;
          tokenError = null;
          break;
        }

        tokenError = { status: res.status, body };
      } catch (e) {
        attemptLogs.push({ name: attempt.name, status: 0, body: { error: String(e) } });
        tokenError = { status: 500, body: { error: String(e) } };
      }
    }

    if (!tokenData || !tokenData.access_token) {
      return new Response(JSON.stringify({
        error: `토큰 발급 실패`,
        details: tokenError,
        attempts: attemptLogs,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

