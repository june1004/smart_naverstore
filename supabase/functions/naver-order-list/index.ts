import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// NOTE:
// 주문/결제 API는 솔루션 심사/권한 부여가 완료되어야 정상 동작합니다.
// 또한 네이버 문서에서 주문 조회 엔드포인트/파라미터가 여러 버전으로 존재할 수 있어,
// 실제 운영 승인 후 문서 기준으로 확정 구현합니다.

interface OrderListRequest {
  storeName: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
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

    return new Response(
      JSON.stringify({
        error: "주문 조회 기능은 승인(심사완료) 후 활성화됩니다.",
        details:
          "현재는 UI/연동 포인트만 준비된 상태입니다. 솔루션 심사완료 및 판매자 권한부여 후 주문 API 엔드포인트를 확정하여 구현합니다.",
        suggestion:
          "심사완료 후에도 401이 지속되면 account_id(판매자 식별자) 및 주문 API 권한(scope)을 확인해주세요.",
        orders: [],
      }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "서버 오류", details: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


