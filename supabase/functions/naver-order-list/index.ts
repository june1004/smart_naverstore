import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface OrderListRequest {
  storeName: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  // UI에서 선택 가능한 기간 프리셋을 지원하기 위한 옵션 (필요 시 확장)
  rangeType?: string | null;
  productOrderStatus?: string[] | null;
  claimStatus?: string[] | null;
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

function toIsoRange(fromDate: string, toDate: string) {
  // 네이버 주문 조건 API는 from/to가 "일시"로 보입니다. (문서: 조회 기준의 시작/종료 일시)
  // UI는 date로 입력하므로 한국시간 기준 '00:00:00' ~ '23:59:59.999' 범위를 만들어 줍니다.
  const from = new Date(`${fromDate}T00:00:00+09:00`).toISOString();
  const to = new Date(`${toDate}T23:59:59.999+09:00`).toISOString();
  return { from, to };
}

function toKstDayStart(date: string) {
  return `${date}T00:00:00`;
}

function toKstDayEnd(date: string) {
  return `${date}T23:59:59.999`;
}

function addDaysDateString(date: string, days: number) {
  const d = new Date(`${date}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function enumerateDatesInclusive(fromDate: string, toDate: string, maxDays = 31) {
  const out: string[] = [];
  let cur = fromDate;
  let i = 0;
  while (cur <= toDate) {
    out.push(cur);
    cur = addDaysDateString(cur, 1);
    i += 1;
    if (i > maxDays) break;
  }
  return out;
}

function buildRangeVariants(fromDate: string, toDate: string) {
  // 네이버가 from/to 형식을 명확히 고정하지 않는 경우가 있어, 여러 포맷을 시도합니다.
  // 1) KST 로컬(오프셋 없음): 2025-12-14T00:00:00
  // 2) KST 로컬(space): 2025-12-14 00:00:00
  // 3) ISO(Z): 2025-12-13T15:00:00.000Z
  const kstFrom = toKstDayStart(fromDate);
  const kstTo = toKstDayEnd(toDate);
  const iso = toIsoRange(fromDate, toDate);

  return [
    { name: "KST local (T)", from: kstFrom, to: kstTo },
    { name: "KST local (space)", from: kstFrom.replace("T", " "), to: kstTo.replace("T", " ") },
    { name: "ISO (Z)", from: iso.from, to: iso.to },
  ];
}

function isMasked(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.includes("*");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: OrderListRequest = await req.json();
    if (!body?.storeName || !body?.dateFrom || !body?.dateTo) {
      return new Response(
        JSON.stringify({ error: "storeName/dateFrom/dateTo가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const applicationId = Deno.env.get("NAVER_APPLICATION_ID");
    const applicationSecret = Deno.env.get("NAVER_APPLICATION_SECRET");
    const solutionId = Deno.env.get("NAVER_SOLUTION_ID")?.trim();

    if (!applicationId || !applicationSecret) {
      return new Response(
        JSON.stringify({
          error:
            "네이버 커머스 API 키가 설정되지 않았습니다. Supabase Secrets에 NAVER_APPLICATION_ID와 NAVER_APPLICATION_SECRET을 설정해주세요.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedSecret = applicationSecret.trim().replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
    if (!cleanedSecret.startsWith("$2a$")) {
      return new Response(
        JSON.stringify({
          error: "네이버 커머스 API secret 형식이 올바르지 않습니다.",
          details: `secret prefix=${cleanedSecret.substring(0, 5)}, length=${cleanedSecret.length}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SELLER 토큰은 account_id(판매자 식별자)별로 캐시/유효시간이 달라집니다.
    // 여기서는 storeName을 account_id로 사용 (승인 후 실제 값 확인 권장)
    const accountId = body.storeName.trim();

    // 1) 토큰 발급 (전자서명 방식)
    const tokenUrl = "https://api.commerce.naver.com/external/v1/oauth2/token";
    const nowMs = Date.now();
    const tsMs = String(nowMs);
    const tsSec = String(Math.floor(nowMs / 1000));

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

    const tokenAttemptLogs: Array<{ name: string; status: number; body: unknown }> = [];
    let tokenData: any = null;
    let tokenError: { status: number; body: unknown } | null = null;
    let tokenAttemptSelected: string | null = null;

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
        tokenParams.append("account_id", accountId);
        if (attempt.extraParams) {
          for (const [k, v] of Object.entries(attempt.extraParams)) tokenParams.append(k, v);
        }

        const res = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams,
        });

        const b = await safeReadJsonOrText(res);
        tokenAttemptLogs.push({ name: attempt.name, status: res.status, body: b });

        if (res.ok) {
          tokenData = b;
          tokenError = null;
          tokenAttemptSelected = attempt.name;
          break;
        }

        tokenError = { status: res.status, body: b };
      } catch (e) {
        tokenAttemptLogs.push({ name: attempt.name, status: 0, body: { error: String(e) } });
        tokenError = { status: 500, body: { error: String(e) } };
      }
    }

    if (!tokenData || !tokenData.access_token) {
      return new Response(
        JSON.stringify({ error: "토큰 발급 실패", details: tokenError, attempts: tokenAttemptLogs }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = tokenData.access_token as string;

    // 2) 주문 조회(조건형)
    // 문서 화면 URL: seller-get-product-orders-with-conditions-pay-order-seller
    // 실제 경로는 문서/버전/계정에 따라 차이가 있을 수 있어 "시도 목록"으로 구현합니다.
    // 참고: 문서에 "to 생략 시 from + 24시간"이라고 되어 있어, 최대 24시간 제한이 있을 수 있습니다.
    // 따라서 기간이 길면 '일 단위'로 나눠 호출합니다.
    const dayList = enumerateDatesInclusive(body.dateFrom, body.dateTo, 62);

    const debug: any = {
      tokenAttemptSelected,
      tokenMeta: { token_type: tokenData.token_type, expires_in: tokenData.expires_in, scope: tokenData.scope },
      orderFetchAttempts: [],
      maskingInfo: {
        note:
          "네이버 정책상 일정 기간 경과 시 전화/이메일 등이 마스킹될 수 있습니다. 본 서비스는 일 단위 동기화로 선저장을 권장합니다.",
      },
    };

    const allBodies: Array<{ url: string; body: any }> = [];
    const successes: Array<{ date: string; url: string }> = [];
    let lastFailure: any = null;

    for (const day of dayList) {
      const variants = buildRangeVariants(day, day);

      for (const v of variants) {
        const query = new URLSearchParams();
        query.append("from", v.from);
        query.append("to", v.to);
        if (body.rangeType) query.append("rangeType", body.rangeType);
        for (const s of body.productOrderStatus ?? []) query.append("productOrderStatus", s);
        for (const s of body.claimStatus ?? []) query.append("claimStatus", s);

        const candidates: Array<{ name: string; method: "GET" | "POST"; url: string; body?: unknown }> = [
          {
            name: `v1 GET /pay-order/seller/product-orders/with-conditions (query) [${v.name}]`,
            method: "GET",
            url: `https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/with-conditions?${query.toString()}`,
          },
          {
            name: `v1 GET /pay-order/seller/product-orders (query) [${v.name}]`,
            method: "GET",
            url: `https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders?${query.toString()}`,
          },
          {
            name: `v2 GET /pay-order/seller/product-orders (query) [${v.name}]`,
            method: "GET",
            url: `https://api.commerce.naver.com/external/v2/pay-order/seller/product-orders?${query.toString()}`,
          },
          {
            name: `v1 POST /pay-order/seller/product-orders/with-conditions (json) [${v.name}]`,
            method: "POST",
            url: "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/with-conditions",
            body: { from: v.from, to: v.to, rangeType: body.rangeType ?? undefined, productOrderStatus: body.productOrderStatus ?? undefined },
          },
          {
            name: `v1 POST /pay-order/seller/product-orders (json) [${v.name}]`,
            method: "POST",
            url: "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders",
            body: { from: v.from, to: v.to, rangeType: body.rangeType ?? undefined, productOrderStatus: body.productOrderStatus ?? undefined },
          },
        ];

        for (const c of candidates) {
          const res = await fetch(c.url, {
            method: c.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: c.method === "POST" ? JSON.stringify(c.body ?? {}) : undefined,
          });
          const b = await safeReadJsonOrText(res);
          debug.orderFetchAttempts.push({ date: day, variant: v.name, name: c.name, status: res.status, url: c.url, body: b });

          if (res.ok) {
            allBodies.push({ url: c.url, body: b });
            successes.push({ date: day, url: c.url });
            lastFailure = null;
            break;
          }

          lastFailure = { status: res.status, body: b, url: c.url, name: c.name, date: day, variant: v.name };
          // 401/403이면 빠르게 종료 (권한 문제)
          if (res.status === 401 || res.status === 403) break;
        }

        // 이 variant에서 성공했으면 다음 날짜로
        if (successes.length > 0 && successes[successes.length - 1]?.date === day) break;
        if (lastFailure?.status === 401 || lastFailure?.status === 403) break;
      }

      if (lastFailure?.status === 401 || lastFailure?.status === 403) break;
    }

    if (allBodies.length === 0) {
      const last = lastFailure ?? debug.orderFetchAttempts[debug.orderFetchAttempts.length - 1];
      const rawStatus = Number(last?.status ?? 500);
      // 네이버 응답이 4xx/5xx인 경우 가능한 한 원본 상태를 보존해서 프론트에서 원인을 구분할 수 있게 합니다.
      // (기존: 401/403이 아니면 무조건 500으로 감쌌음 → 디버깅이 어려움)
      const status =
        Number.isFinite(rawStatus) && rawStatus >= 100 && rawStatus <= 599 ? rawStatus : 502;
      return new Response(
        JSON.stringify({
          error:
            status === 401 || status === 403
              ? "네이버 주문 API 인증/권한 오류"
              : status === 404
                ? "네이버 주문 API 엔드포인트/리소스를 찾을 수 없습니다"
                : status === 429
                  ? "네이버 주문 API 호출이 너무 많습니다(429)"
                  : status >= 400 && status < 500
                    ? "네이버 주문 API 요청 오류"
                    : "네이버 주문 API 서버 오류",
          details: last?.body ?? null,
          debug,
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) 응답 정규화
    // 구조가 다양할 수 있어 최대한 방어적으로 파싱합니다.
    const list: any[] = [];
    const sources: string[] = [];
    for (const it of allBodies) {
      sources.push(it.url);
      const root: any = it.body;
      const one: any[] =
        (Array.isArray(root?.contents) ? root.contents : null) ??
        (Array.isArray(root?.productOrders) ? root.productOrders : null) ??
        (Array.isArray(root) ? root : []);
      for (const row of one) list.push(row);
    }

    const orders = list
      .map((item: any) => {
        const orderId =
          item?.orderId ??
          item?.productOrderId ??
          item?.productOrder?.orderId ??
          item?.productOrder?.productOrderId ??
          item?.productOrder?.id;
        if (!orderId) return null;

        const buyerName = item?.ordererName ?? item?.buyerName ?? item?.orderer?.name ?? item?.orderer?.ordererName;
        const phone =
          item?.ordererTel ?? item?.ordererPhone ?? item?.buyerPhone ?? item?.orderer?.tel ?? item?.orderer?.phone;
        const email = item?.ordererEmail ?? item?.buyerEmail ?? item?.orderer?.email;
        const address =
          item?.shippingAddress ??
          item?.receiverAddress ??
          item?.shipping?.address ??
          item?.deliveryAddress ??
          item?.receiver?.address;
        const orderedAt = item?.orderDate ?? item?.orderedAt ?? item?.productOrder?.orderDate ?? item?.createdAt;
        const status = item?.productOrderStatus ?? item?.status ?? item?.productOrder?.productOrderStatus;
        const paymentAmount = item?.paymentAmount ?? item?.payAmount ?? item?.totalPaymentAmount ?? null;

        return {
          orderId: String(orderId),
          orderedAt: orderedAt ? String(orderedAt) : undefined,
          buyerName: buyerName ? String(buyerName) : undefined,
          phone: phone ? String(phone) : undefined,
          email: email ? String(email) : undefined,
          address: address ? String(address) : undefined,
          status: status ? String(status) : undefined,
          paymentAmount: typeof paymentAmount === "number" ? paymentAmount : undefined,
          masked: {
            phone: isMasked(phone),
            email: isMasked(email),
          },
        };
      })
      .filter(Boolean);

    return new Response(
      JSON.stringify({
        sources,
        dateFrom: body.dateFrom,
        dateTo: body.dateTo,
        fetchedDays: successes,
        orders,
        debug,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "서버 오류", details: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


