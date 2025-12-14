import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import bcrypt from "npm:bcryptjs@2.4.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type UserStoreRow = {
  id: string;
  user_id: string;
  store_name: string;
  enabled: boolean;
  sync_days: number;
  last_synced_at: string | null;
};

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

function toIsoRangeLastDays(days: number) {
  const now = new Date();
  const toDate = new Date(now);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - Math.max(1, days) + 1);

  // KST 기준 일자 범위
  const to = new Date(`${toDate.toISOString().slice(0, 10)}T23:59:59.999+09:00`).toISOString();
  const from = new Date(`${fromDate.toISOString().slice(0, 10)}T00:00:00+09:00`).toISOString();
  return { from, to };
}

function isMasked(value: unknown): boolean {
  return typeof value === "string" && value.includes("*");
}

function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  if (isMasked(phone)) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits || null;
}

function normalizeEmail(email?: string | null) {
  if (!email) return null;
  if (isMasked(email)) return null;
  const e = email.trim().toLowerCase();
  return e || null;
}

function makeContactKey(phone?: string | null, email?: string | null, orderId?: string | null) {
  const p = normalizePhone(phone);
  if (p) return `phone:${p}`;
  const e = normalizeEmail(email);
  if (e) return `email:${e}`;
  const oid = (orderId ?? "").trim();
  if (oid) return `order:${oid}`;
  return null;
}

async function issueAccessToken(params: {
  applicationId: string;
  applicationSecret: string;
  solutionId?: string | null;
  accountId: string;
}) {
  const tokenUrl = "https://api.commerce.naver.com/external/v1/oauth2/token";
  const cleanedSecret = params.applicationSecret.trim().replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");

  if (!cleanedSecret.startsWith("$2a$")) {
    throw new Error("NAVER_APPLICATION_SECRET 형식이 올바르지 않습니다. ($2a$... 형식 필요)");
  }

  const nowMs = Date.now();
  const tsMs = String(nowMs);
  const tsSec = String(Math.floor(nowMs / 1000));

  const attempts: TokenAttempt[] = [
    {
      name: "SELF + ms + client_id=appId + base64(sign)",
      clientId: params.applicationId,
      type: "SELF",
      timestamp: tsMs,
      signaturePassword: `${params.applicationId}_${tsMs}`,
    },
    {
      name: "SELF + sec + client_id=appId + base64(sign)",
      clientId: params.applicationId,
      type: "SELF",
      timestamp: tsSec,
      signaturePassword: `${params.applicationId}_${tsSec}`,
    },
  ];

  if (params.solutionId) {
    attempts.push(
      {
        name: "SOLUTION + ms + client_id=appId + base64(sign) + solutionId param",
        clientId: params.applicationId,
        type: "SOLUTION",
        timestamp: tsMs,
        signaturePassword: `${params.applicationId}_${tsMs}`,
        extraParams: { solutionId: params.solutionId },
      },
      {
        name: "SOLUTION + sec + client_id=appId + base64(sign) + solutionId param",
        clientId: params.applicationId,
        type: "SOLUTION",
        timestamp: tsSec,
        signaturePassword: `${params.applicationId}_${tsSec}`,
        extraParams: { solutionId: params.solutionId },
      },
      {
        name: "SOLUTION + ms + client_id=solutionId + base64(sign)",
        clientId: params.solutionId,
        type: "SOLUTION",
        timestamp: tsMs,
        signaturePassword: `${params.solutionId}_${tsMs}`,
      },
      {
        name: "SOLUTION + sec + client_id=solutionId + base64(sign)",
        clientId: params.solutionId,
        type: "SOLUTION",
        timestamp: tsSec,
        signaturePassword: `${params.solutionId}_${tsSec}`,
      }
    );
  }

  let lastError: unknown = null;
  for (const a of attempts) {
    const signatureRaw = bcrypt.hashSync(a.signaturePassword, cleanedSecret);
    const signature = base64EncodeAscii(signatureRaw);

    const form = new URLSearchParams();
    form.append("grant_type", "client_credentials");
    form.append("client_id", a.clientId);
    form.append("timestamp", a.timestamp);
    form.append("client_secret_sign", signature);
    form.append("type", a.type);
    form.append("account_id", params.accountId);
    if (a.extraParams) for (const [k, v] of Object.entries(a.extraParams)) form.append(k, v);

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const body = await safeReadJsonOrText(res);
    if (res.ok) {
      const token: any = body;
      if (!token?.access_token) throw new Error("토큰 응답에 access_token이 없습니다.");
      return token.access_token as string;
    }
    lastError = body;
  }

  throw new Error(`토큰 발급 실패: ${JSON.stringify(lastError)}`);
}

async function fetchOrders(params: {
  accessToken: string;
  fromIso: string;
  toIso: string;
}) {
  const query = new URLSearchParams();
  query.append("from", params.fromIso);
  query.append("to", params.toIso);

  const candidates: Array<{ name: string; method: "GET" | "POST"; url: string; body?: unknown }> = [
    {
      name: "v1 GET /pay-order/seller/product-orders (query)",
      method: "GET",
      url: `https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders?${query.toString()}`,
    },
    {
      name: "v1 GET /pay-order/seller/product-orders/with-conditions (query)",
      method: "GET",
      url: `https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/with-conditions?${query.toString()}`,
    },
    {
      name: "v2 GET /pay-order/seller/product-orders (query)",
      method: "GET",
      url: `https://api.commerce.naver.com/external/v2/pay-order/seller/product-orders?${query.toString()}`,
    },
  ];

  let last: any = null;
  for (const c of candidates) {
    const res = await fetch(c.url, {
      method: c.method,
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });
    const body = await safeReadJsonOrText(res);
    last = { name: c.name, status: res.status, url: c.url, body };
    if (res.ok) return { source: c.url, body };
    if (res.status === 401 || res.status === 403) break;
  }

  throw new Error(`주문 조회 실패: ${JSON.stringify(last)}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  // 보안: 크론 전용 시크릿 헤더로만 실행(권장)
  const expected = Deno.env.get("CRON_SECRET")?.trim();
  if (expected) {
    const provided = req.headers.get("x-cron-secret")?.trim();
    if (!provided || provided !== expected) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  const applicationId = Deno.env.get("NAVER_APPLICATION_ID")!;
  const applicationSecret = Deno.env.get("NAVER_APPLICATION_SECRET")!;
  const solutionId = Deno.env.get("NAVER_SOLUTION_ID")?.trim() ?? null;

  try {
    const { data: stores, error } = await sb
      .from("user_stores")
      .select("id,user_id,store_name,enabled,sync_days,last_synced_at")
      .eq("enabled", true)
      .limit(500);
    if (error) throw error;

    const results: any[] = [];
    for (const s of (stores ?? []) as UserStoreRow[]) {
      const syncDays = Math.max(1, Math.min(90, s.sync_days ?? 7));
      const { from, to } = toIsoRangeLastDays(syncDays);

      try {
        const accessToken = await issueAccessToken({
          applicationId,
          applicationSecret,
          solutionId,
          accountId: s.store_name,
        });

        const { source, body } = await fetchOrders({ accessToken, fromIso: from, toIso: to });
        const root: any = body;
        const list: any[] =
          (Array.isArray(root?.contents) ? root.contents : null) ??
          (Array.isArray(root?.productOrders) ? root.productOrders : null) ??
          (Array.isArray(root) ? root : []);

        let upserted = 0;
        for (const item of list) {
          const orderId =
            item?.orderId ??
            item?.productOrderId ??
            item?.productOrder?.orderId ??
            item?.productOrder?.productOrderId ??
            item?.productOrder?.id;
          if (!orderId) continue;

          const buyerName =
            item?.ordererName ?? item?.buyerName ?? item?.orderer?.name ?? item?.orderer?.ordererName ?? null;
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

          const nPhone = normalizePhone(phone ?? null);
          const nEmail = normalizeEmail(email ?? null);
          const contactKey = makeContactKey(phone ?? null, email ?? null, String(orderId));

          // 기존 row가 있으면 마스킹/null로 덮어쓰지 않도록 보수적으로 업데이트
          const { data: existing } = await sb
            .from("customer_vault_entries")
            .select("id,phone,email")
            .eq("user_id", s.user_id)
            .eq("order_id", String(orderId))
            .maybeSingle();

          if (existing?.id) {
            const patch: any = {
              title: `${s.store_name} 주문 고객`,
              buyer_name: buyerName ? String(buyerName) : null,
              address: address ? String(address) : null,
              ordered_at: orderedAt ? String(orderedAt) : null,
            };
            if (nPhone) patch.phone = nPhone;
            if (nEmail) patch.email = nEmail;
            await sb.from("customer_vault_entries").update(patch).eq("id", existing.id);
            upserted += 1;
            continue;
          }

          // 신규/미존재: upsert (B 정책)
          const rawText = [
            `주문번호: ${String(orderId)}`,
            orderedAt ? `주문일시: ${String(orderedAt)}` : "",
            buyerName ? `이름: ${String(buyerName)}` : "",
            nPhone ? `휴대폰: ${nPhone}` : "",
            nEmail ? `이메일: ${nEmail}` : "",
            address ? `주소: ${String(address)}` : "",
          ]
            .filter(Boolean)
            .join("\n");

          await sb.from("customer_vault_entries").upsert(
            {
              user_id: s.user_id,
              title: `${s.store_name} 주문 고객`,
              raw_text: rawText,
              buyer_name: buyerName ? String(buyerName) : null,
              phone: nPhone,
              email: nEmail,
              address: address ? String(address) : null,
              order_id: String(orderId),
              ordered_at: orderedAt ? String(orderedAt) : null,
              contact_key: contactKey,
              memo: null,
            },
            { onConflict: "user_id,contact_key" }
          );
          upserted += 1;
        }

        await sb.from("user_stores").update({ last_synced_at: new Date().toISOString() }).eq("id", s.id);
        results.push({ store: s.store_name, ok: true, source, from, to, upserted });
      } catch (e) {
        results.push({ store: s.store_name, ok: false, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


