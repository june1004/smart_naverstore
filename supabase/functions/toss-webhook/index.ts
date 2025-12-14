import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toBasicAuth(secretKey: string) {
  return btoa(`${secretKey}:`);
}

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function pickNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function extractPayload(body: any) {
  // Toss webhook payload은 제품/설정에 따라 구조가 다를 수 있어 방어적으로 파싱합니다.
  const root = body ?? {};
  const data = root.data ?? root.payment ?? root;

  const paymentKey =
    pickString(root.paymentKey) ?? pickString(data.paymentKey) ?? pickString(data.payment_key);
  const orderId =
    pickString(root.orderId) ?? pickString(data.orderId) ?? pickString(data.order_id);
  const amount =
    pickNumber(root.amount) ?? pickNumber(data.totalAmount) ?? pickNumber(data.amount);
  const eventType = pickString(root.eventType) ?? pickString(root.type) ?? pickString(root.event);

  return { paymentKey, orderId, amount, eventType };
}

function mapTossStatusToInternal(status: string | null): "paid" | "cancelled" | "failed" | "ready" {
  const s = (status ?? "").toUpperCase();
  if (s === "DONE" || s === "PAID" || s === "COMPLETED") return "paid";
  if (s === "CANCELED" || s === "CANCELLED") return "cancelled";
  if (s === "FAILED") return "failed";
  return "ready";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const tossSecretKey = Deno.env.get("TOSS_SECRET_KEY");

  if (!tossSecretKey) {
    return new Response(JSON.stringify({ error: "TOSS_SECRET_KEY가 설정되지 않았습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);

  try {
    const raw = await req.text();
    let body: any = raw;
    try {
      body = JSON.parse(raw);
    } catch {
      // keep as text
    }

    const { paymentKey, orderId, amount, eventType } = extractPayload(body);

    if (!paymentKey) {
      await sb.from("payment_webhook_events").insert({
        provider: "toss",
        event_type: eventType,
        order_id: orderId,
        payment_key: null,
        status: null,
        raw: typeof body === "string" ? { raw: body } : body,
        error_text: "paymentKey가 없어 결제 조회를 수행할 수 없습니다.",
      });
      return new Response(JSON.stringify({ ok: false, error: "paymentKey missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Toss 결제 조회로 검증 (웹훅 위조 방지: paymentKey 기반 실결제 확인)
    const detailRes = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${toBasicAuth(tossSecretKey)}`,
      },
    });

    const detailText = await detailRes.text();
    let detail: any = detailText;
    try {
      detail = JSON.parse(detailText);
    } catch {
      // ignore
    }

    if (!detailRes.ok) {
      await sb.from("payment_webhook_events").insert({
        provider: "toss",
        event_type: eventType,
        order_id: orderId,
        payment_key: paymentKey,
        status: null,
        raw: { webhook: typeof body === "string" ? { raw: body } : body, toss_detail: detail },
        error_text: `Toss payment detail 조회 실패 status=${detailRes.status}`,
      });
      return new Response(JSON.stringify({ ok: false, error: "detail fetch failed" }), {
        status: 200, // webhook 재시도 폭주 방지: 응답은 200으로 처리, 기록으로 추적
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifiedOrderId = pickString(detail.orderId);
    const verifiedAmount = pickNumber(detail.totalAmount) ?? pickNumber(detail.amount);
    const verifiedStatus = pickString(detail.status);

    if (orderId && verifiedOrderId && orderId !== verifiedOrderId) {
      await sb.from("payment_webhook_events").insert({
        provider: "toss",
        event_type: eventType,
        order_id: orderId,
        payment_key: paymentKey,
        status: verifiedStatus,
        raw: { webhook: typeof body === "string" ? { raw: body } : body, toss_detail: detail },
        error_text: `orderId 불일치: webhook=${orderId} / toss=${verifiedOrderId}`,
      });
      return new Response(JSON.stringify({ ok: false, mismatch: "orderId" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof amount === "number" && typeof verifiedAmount === "number" && amount !== verifiedAmount) {
      await sb.from("payment_webhook_events").insert({
        provider: "toss",
        event_type: eventType,
        order_id: verifiedOrderId ?? orderId,
        payment_key: paymentKey,
        status: verifiedStatus,
        raw: { webhook: typeof body === "string" ? { raw: body } : body, toss_detail: detail },
        error_text: `amount 불일치: webhook=${amount} / toss=${verifiedAmount}`,
      });
      return new Response(JSON.stringify({ ok: false, mismatch: "amount" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const internalStatus = mapTossStatusToInternal(verifiedStatus);
    const orderIdFinal = verifiedOrderId ?? orderId;

    if (!orderIdFinal) {
      await sb.from("payment_webhook_events").insert({
        provider: "toss",
        event_type: eventType,
        order_id: null,
        payment_key: paymentKey,
        status: verifiedStatus,
        raw: { webhook: typeof body === "string" ? { raw: body } : body, toss_detail: detail },
        error_text: "orderId를 확인할 수 없습니다.",
      });
      return new Response(JSON.stringify({ ok: false, error: "orderId missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) payment_orders 매칭 및 업데이트
    const { data: po, error: poErr } = await sb
      .from("payment_orders")
      .select("id,user_id,plan,status,amount")
      .eq("order_id", orderIdFinal)
      .maybeSingle();

    if (poErr) throw poErr;

    if (!po?.id) {
      // 우리 DB에 없는 주문: 이벤트만 기록
      await sb.from("payment_webhook_events").insert({
        provider: "toss",
        event_type: eventType,
        order_id: orderIdFinal,
        payment_key: paymentKey,
        status: verifiedStatus,
        raw: { webhook: typeof body === "string" ? { raw: body } : body, toss_detail: detail },
        error_text: "payment_orders에 매칭되는 order_id가 없습니다.",
      });
      return new Response(JSON.stringify({ ok: true, unmatched: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 이미 paid라면 멱등 처리
    if (po.status === "paid" && internalStatus === "paid") {
      return new Response(JSON.stringify({ ok: true, idempotent: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb
      .from("payment_orders")
      .update({
        status: internalStatus,
        payment_key: paymentKey,
        approved_at: internalStatus === "paid" ? new Date().toISOString() : null,
        raw: detail,
      })
      .eq("order_id", orderIdFinal);

    // 3) paid면 엔타이틀먼트 반영 (취소는 자동 회수하지 않음: 운영 정책 필요)
    if (internalStatus === "paid") {
      if (po.plan === "base") {
        await sb.from("profiles").update({ is_paid_subscriber: true }).eq("id", po.user_id);
      } else if (po.plan === "store_addon") {
        await sb
          .from("profiles")
          .update({ is_paid_subscriber: true, store_addon_active: true })
          .eq("id", po.user_id);
      }
    }

    return new Response(JSON.stringify({ ok: true, status: internalStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await sb.from("payment_webhook_events").insert({
      provider: "toss",
      event_type: null,
      order_id: null,
      payment_key: null,
      status: null,
      raw: null,
      error_text: String(e),
    });
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


