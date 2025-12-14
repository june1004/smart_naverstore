import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const PricingFail = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const code = params.get("code");
  const message = params.get("message");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0F9F8] via-white to-[#E6F4F1] px-6">
      <Card className="max-w-lg w-full border border-[#E2D9C8] bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-slate-700 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-rose-600" />
            결제 실패
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600 space-y-1">
            <div>code: {code ?? "-"}</div>
            <div>message: {message ?? "-"}</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
              onClick={() => navigate("/pricing")}
            >
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingFail;


