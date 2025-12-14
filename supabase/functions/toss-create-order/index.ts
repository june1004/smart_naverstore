import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Body = {
  plan: "base" | "store_addon";
};

function makeOrderId(prefix: string) {
  // Toss: orderId는 최대 64자, 영문/숫자/일부 특수문자 허용
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.slice(0, 64);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const plan = body?.plan;
    if (plan !== "base" && plan !== "store_addon") {
      return new Response(JSON.stringify({ error: "plan(base|store_addon)이 필요합니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseAmount = Number(Deno.env.get("TOSS_BASE_PLAN_AMOUNT") ?? "10000");
    const addonAmount = Number(Deno.env.get("TOSS_STORE_ADDON_AMOUNT") ?? "20000");
    const amount = plan === "base" ? baseAmount : addonAmount;

    const orderName =
      plan === "base" ? "Pro Seller Plan - 월간 구독" : "Store Manager Add-on - 월간 구독";

    const origin = req.headers.get("origin") ?? "http://localhost:9000";
    const successUrl = `${origin}/pricing/success`;
    const failUrl = `${origin}/pricing/fail`;

    const orderId = makeOrderId(plan === "base" ? "BASE" : "ADDON");

    const sb = createClient(supabaseUrl, serviceRoleKey);
    const { error: insertErr } = await sb.from("payment_orders").insert({
      user_id: userData.user.id,
      provider: "toss",
      plan,
      order_id: orderId,
      amount,
      status: "ready",
      raw: { created_by: "toss-create-order" },
    });
    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        orderId,
        amount,
        orderName,
        successUrl,
        failUrl,
        customerName: userData.user.email ?? "customer",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error", details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


