import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

const PricingSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(true);

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amountStr = params.get("amount");
    const amount = amountStr ? Number(amountStr) : NaN;

    const run = async () => {
      if (!paymentKey || !orderId || !Number.isFinite(amount)) {
        toast({
          title: "결제 정보가 부족합니다",
          description: "paymentKey/orderId/amount를 확인할 수 없습니다.",
          variant: "destructive",
        });
        setIsConfirming(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("toss-confirm-payment", {
          body: { paymentKey, orderId, amount },
        });
        if (error) throw error;
        toast({ title: "결제 확인 완료", description: "구독 권한이 활성화되었습니다." });
      } catch (e: any) {
        toast({
          title: "결제 확인 실패",
          description: e?.message || "Toss 승인(confirm)에 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsConfirming(false);
      }
    };

    void run();
  }, [params, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0F9F8] via-white to-[#E6F4F1] px-6">
      <Card className="max-w-lg w-full border border-[#E2D9C8] bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-slate-700 flex items-center gap-2">
            {isConfirming ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-[#0F4C5C]" />
                결제 확인 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                결제 완료
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            결제 확인이 끝나면 구독 권한이 자동으로 활성화됩니다.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
              onClick={() => navigate("/dashboard")}
            >
              대시보드로
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingSuccess;


