import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert, Receipt, Search } from "lucide-react";

type OrderRow = {
  orderId: string;
  orderedAt?: string;
  buyerName?: string;
  productSummary?: string;
  paymentAmount?: number;
  status?: string;
};

const StoreOrders = () => {
  const { toast } = useToast();
  const [storeName, setStoreName] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<OrderRow[]>([]);

  const canQuery = useMemo(() => {
    return Boolean(storeName.trim() && dateFrom && dateTo);
  }, [storeName, dateFrom, dateTo]);

  const handleQuery = async () => {
    if (!canQuery) {
      toast({
        title: "입력값이 필요합니다",
        description: "상점명과 조회 기간(시작/종료)을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setRows([]);

    try {
      // NOTE: 승인 전에는 401이 정상일 수 있습니다.
      // 승인 후에는 Edge Function을 실제 주문 조회 API로 연결합니다.
      const { data, error } = await supabase.functions.invoke("naver-order-list", {
        body: { storeName: storeName.trim(), dateFrom, dateTo },
      });

      if (error) throw error;

      const items = Array.isArray((data as any)?.orders) ? (data as any).orders : [];
      setRows(items);

      toast({
        title: "조회 완료",
        description: `${items.length}건의 주문을 불러왔습니다.`,
      });
    } catch (e: any) {
      // 승인 전/권한 미부여: 401이 가장 흔함
      toast({
        title: "주문 조회 실패",
        description:
          e?.message ||
          "주문 조회 중 오류가 발생했습니다. (승인/연결 전에는 접근이 제한될 수 있습니다.)",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-[#E2D9C8] bg-white">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-slate-700">승인 전에는 주문/결제 API가 제한될 수 있어요</AlertTitle>
        <AlertDescription className="text-slate-600">
          현재 솔루션이 심사요청중이면 네이버가 주문/결제 데이터 접근을 401로 차단할 수 있습니다.
          심사완료 후 자동으로 동작하도록 구조를 미리 만들어두었습니다.
        </AlertDescription>
      </Alert>

      <Card className="shadow-sm border border-[#E2D9C8] bg-white rounded-xl">
        <CardHeader className="bg-gradient-to-r from-[#0F4C5C] to-[#1a6b7a] text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            주문/결제 내역 조회
          </CardTitle>
          <CardDescription className="text-slate-100">
            상점명과 기간을 입력하면 주문 목록을 가져옵니다 (승인 후 활성화).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-slate-700">상점명</Label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="예: nanumlab"
                className="border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">시작일</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">종료일</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              onClick={handleQuery}
              disabled={!canQuery || isLoading}
              className="bg-[#0F4C5C] hover:bg-[#0a3d4a] text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  조회 중...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  주문 조회
                </>
              )}
            </Button>
          </div>

          <div className="border border-[#E2D9C8] rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-3 bg-[#F0F9F8] text-sm font-semibold text-slate-700">
              결과 ({rows.length})
            </div>
            {rows.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">
                아직 조회된 데이터가 없습니다. (승인 전에는 401이 정상일 수 있어요)
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <div key={r.orderId} className="p-4 flex flex-col md:flex-row md:items-center gap-2">
                    <div className="font-mono text-xs text-slate-500">{r.orderId}</div>
                    <div className="flex-1 text-sm text-slate-700">{r.productSummary ?? "-"}</div>
                    <div className="text-sm text-slate-600">{r.buyerName ?? "-"}</div>
                    <div className="text-sm text-slate-700 font-semibold">
                      {typeof r.paymentAmount === "number" ? `${r.paymentAmount.toLocaleString()}원` : "-"}
                    </div>
                    <div className="text-xs text-slate-500">{r.status ?? "-"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreOrders;


