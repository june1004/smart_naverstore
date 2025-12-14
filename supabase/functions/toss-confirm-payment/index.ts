import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Body = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

function toBasicAuth(secretKey: string) {
  // Toss: Authorization: Basic base64(secretKey + ":")
  return btoa(`${secretKey}:`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tossSecretKey = Deno.env.get("TOSS_SECRET_KEY");

    if (!tossSecretKey) {
      return new Response(JSON.stringify({ error: "TOSS_SECRET_KEY가 설정되지 않았습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.paymentKey || !body?.orderId || typeof body?.amount !== "number") {
      return new Response(JSON.stringify({ error: "paymentKey/orderId/amount가 필요합니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error: orderErr } = await sb
      .from("payment_orders")
      .select("id,user_id,plan,amount,status")
      .eq("order_id", body.orderId)
      .single();
    if (orderErr) throw orderErr;

    if (order.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status === "paid") {
      return new Response(JSON.stringify({ ok: true, alreadyPaid: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Toss 결제 승인(Confirm)
    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${toBasicAuth(tossSecretKey)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: body.paymentKey,
        orderId: body.orderId,
        amount: body.amount,
      }),
    });

    const text = await res.text();
    let payload: any = text;
    try {
      payload = JSON.parse(text);
    } catch {
      // ignore
    }

    if (!res.ok) {
      await sb
        .from("payment_orders")
        .update({ status: "failed", raw: payload })
        .eq("order_id", body.orderId);

      return new Response(
        JSON.stringify({ error: "Toss confirm 실패", details: payload }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 결제 성공 → order 업데이트
    await sb
      .from("payment_orders")
      .update({
        status: "paid",
        payment_key: body.paymentKey,
        approved_at: new Date().toISOString(),
        raw: payload,
      })
      .eq("order_id", body.orderId);

    // 엔타이틀먼트 반영
    if (order.plan === "base") {
      await sb.from("profiles").update({ is_paid_subscriber: true }).eq("id", userData.user.id);
    } else if (order.plan === "store_addon") {
      await sb
        .from("profiles")
        .update({ is_paid_subscriber: true, store_addon_active: true })
        .eq("id", userData.user.id);
    }

    return new Response(JSON.stringify({ ok: true, plan: order.plan }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error", details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


