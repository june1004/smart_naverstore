import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

interface ProductUpdateRequest {
  originProductId: string;
  storeName?: string | null;
  accountId?: string | null;
  product: {
    name: string;
    detailContent: string;
    tags: string[];
    images?: string[];
    // (추후 확장) SEO/메타 정보는 네이버 스펙 확정 후 반영
    metaTitle?: string;
    metaDescription?: string;
  };
}

type TokenAttempt = {
  name: string;
  clientId: string;
  type: "SELF" | "SOLUTION";
  timestamp: string;
  signaturePassword: string;
  extraParams?: Record<string, string>;
};

function base64EncodeAscii(input: string) {
  return btoa(input);
}

async function safeReadJsonOrText(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function pickFirstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "number" && Number.isFinite(c)) return String(c);
  }
  return null;
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

    // 1) 전자서명 기반 OAuth 2.0 토큰 발급 (naver-product-get과 동일 전략)
    const tokenUrl = "https://api.commerce.naver.com/external/v1/oauth2/token";
    const nowMs = Date.now();
    const tsMs = String(nowMs);
    const tsSec = String(Math.floor(nowMs / 1000));

    const cleanedSecret = applicationSecret.trim().replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
    const solutionId = Deno.env.get("NAVER_SOLUTION_ID")?.trim();

    if (!cleanedSecret.startsWith("$2a$")) {
      return new Response(
        JSON.stringify({
          error: "네이버 커머스 API secret 형식이 올바르지 않습니다.",
          details: `secret prefix=${cleanedSecret.substring(0, 5)}, length=${cleanedSecret.length}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountId =
      (body.accountId ?? undefined)?.toString().trim() ||
      (body.storeName ?? undefined)?.toString().trim() ||
      Deno.env.get("NAVER_ACCOUNT_ID")?.trim();

    const attempts: TokenAttempt[] = [
      {
        name: "SELF + ms + client_id=appId + base64(sign)",
        clientId: applicationId,
        type: "SELF",
        timestamp: tsMs,
        signaturePassword: `${applicationId}_${tsMs}`,
      },
      {
        name: "SELF + sec + client_id=appId + base64(sign)",
        clientId: applicationId,
        type: "SELF",
        timestamp: tsSec,
        signaturePassword: `${applicationId}_${tsSec}`,
      },
    ];

    if (solutionId) {
      attempts.push(
        {
          name: "SOLUTION + ms + client_id=appId + base64(sign) + solutionId param",
          clientId: applicationId,
          type: "SOLUTION",
          timestamp: tsMs,
          signaturePassword: `${applicationId}_${tsMs}`,
          extraParams: { solutionId },
        },
        {
          name: "SOLUTION + sec + client_id=appId + base64(sign) + solutionId param",
          clientId: applicationId,
          type: "SOLUTION",
          timestamp: tsSec,
          signaturePassword: `${applicationId}_${tsSec}`,
          extraParams: { solutionId },
        },
        {
          name: "SOLUTION + ms + client_id=solutionId + base64(sign)",
          clientId: solutionId,
          type: "SOLUTION",
          timestamp: tsMs,
          signaturePassword: `${solutionId}_${tsMs}`,
        },
        {
          name: "SOLUTION + sec + client_id=solutionId + base64(sign)",
          clientId: solutionId,
          type: "SOLUTION",
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
        const signatureRaw = bcrypt.hashSync(attempt.signaturePassword, cleanedSecret);
        const signature = base64EncodeAscii(signatureRaw);

        const tokenParams = new URLSearchParams();
        tokenParams.append("grant_type", "client_credentials");
        tokenParams.append("client_id", attempt.clientId);
        tokenParams.append("timestamp", attempt.timestamp);
        tokenParams.append("client_secret_sign", signature);
        tokenParams.append("type", attempt.type);
        if (accountId) tokenParams.append("account_id", accountId);
        if (attempt.extraParams) {
          for (const [k, v] of Object.entries(attempt.extraParams)) tokenParams.append(k, v);
        }

        const res = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams,
        });

        const body = await safeReadJsonOrText(res);
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
      return new Response(
        JSON.stringify({ error: "토큰 발급 실패", details: tokenError, attempts: attemptLogs }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // 2) 기존 이미지 유지: images가 없으면 현재 상품 정보를 조회해서 images를 채웁니다.
    let imagesToUse: string[] | undefined = product.images;
    if (!imagesToUse) {
      const originV2 = `https://api.commerce.naver.com/external/v2/products/origin-products/${originProductId}`;
      const originV1 = `https://api.commerce.naver.com/external/v1/products/origin-products/${originProductId}`;

      const resV2 = await fetch(originV2, { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } });
      const bodyV2 = await safeReadJsonOrText(resV2);
      if (resV2.ok) {
        const b: any = bodyV2;
        imagesToUse = b?.images ?? b?.product?.images;
      } else {
        const resV1 = await fetch(originV1, { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } });
        const bodyV1 = await safeReadJsonOrText(resV1);
        if (resV1.ok) {
          const b: any = bodyV1;
          imagesToUse = b?.images ?? b?.product?.images;
        }
      }
    }

    // 3) 상품 정보 업데이트 API 호출
    // PUT /external/v1/products/origin-products/{originProductId}
    const updateUrl = `https://api.commerce.naver.com/external/v1/products/origin-products/${originProductId}`;
    
    // 네이버 커머스 API 요청 본문 구성
    const updateBody = {
      name: product.name,
      detailContent: product.detailContent,
      tags: product.tags || [],
      // images는 기존 이미지 유지 (가능하면 포함)
      ...(imagesToUse ? { images: imagesToUse } : {}),
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
      const errorBody = await safeReadJsonOrText(updateResponse);
      console.error('상품 업데이트 실패:', updateResponse.status, errorBody);
      return new Response(JSON.stringify({ 
        error: `상품 업데이트 실패: ${updateResponse.status}`,
        details: errorBody
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

