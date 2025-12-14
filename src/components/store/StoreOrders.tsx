import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert, Receipt, Search, Save, RefreshCw } from "lucide-react";

type OrderRow = {
  orderId: string;
  orderedAt?: string;
  buyerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  productSummary?: string;
  paymentAmount?: number;
  status?: string;
  masked?: { phone?: boolean; email?: boolean };
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const addDays = (d: Date, days: number) => {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
};

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

const normalizePhone = (phone?: string) => {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits || null;
};

const normalizeEmail = (email?: string) => {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return e || null;
};

const makeContactKey = (phone?: string, email?: string) => {
  const hasMasked = (v?: string) => Boolean(v && v.includes("*"));
  const p = normalizePhone(phone);
  if (p && !hasMasked(phone)) return `phone:${p}`;
  const e = normalizeEmail(email);
  if (e && !hasMasked(email)) return `email:${e}`;
  return null;
};

const StoreOrders = () => {
  const { toast } = useToast();
  const [storeName, setStoreName] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [autoSaveCustomers, setAutoSaveCustomers] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncDays, setSyncDays] = useState(7);
  const [isSavingSyncSettings, setIsSavingSyncSettings] = useState(false);

  const canQuery = useMemo(() => {
    return Boolean(storeName.trim() && dateFrom && dateTo);
  }, [storeName, dateFrom, dateTo]);

  const canSaveSyncSettings = useMemo(() => Boolean(storeName.trim()), [storeName]);

  useEffect(() => {
    // 기본 UX: 스토어명이 nanumlab이면 최근 7일 자동 세팅
    if (!dateFrom && !dateTo) applyPreset(7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSyncSettings = async (sn: string) => {
    try {
      const { data, error } = await supabase
        .from("user_stores" as any)
        .select("enabled,sync_days")
        .eq("store_name", sn)
        .maybeSingle();
      if (error) return;
      if (data) {
        setSyncEnabled(Boolean((data as any).enabled));
        setSyncDays(Number((data as any).sync_days ?? 7));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const sn = storeName.trim();
    if (!sn) return;
    void loadSyncSettings(sn);
  }, [storeName]);

  const saveSyncSettings = async () => {
    const sn = storeName.trim();
    if (!sn) return;
    setIsSavingSyncSettings(true);
    try {
      const { error } = await supabase
        .from("user_stores" as any)
        .upsert(
          {
            store_name: sn,
            enabled: syncEnabled,
            sync_days: Math.max(1, Math.min(90, syncDays)),
          },
          { onConflict: "user_id,store_name" }
        );
      if (error) throw error;
      toast({
        title: "자동 동기화 설정 저장됨",
        description: `기본 ${Math.max(1, Math.min(90, syncDays))}일 · 매일 1회 동기화`,
      });
    } catch (e: any) {
      toast({
        title: "설정 저장 실패",
        description: e?.message || "user_stores 테이블/마이그레이션 적용 여부를 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSyncSettings(false);
    }
  };

  const applyPreset = (days: number) => {
    const today = new Date();
    const to = toDateInput(today);
    const from = toDateInput(addDays(today, -days + 1));
    setDateFrom(from);
    setDateTo(to);
  };

  const saveCustomerFromOrder = async (o: OrderRow) => {
    // 마스킹된 값은 저장해도 의미가 없으므로, 저장 시도 전에 안내
    if (o.masked?.phone || o.masked?.email) {
      toast({
        title: "마스킹 감지",
        description:
          "전화번호/이메일이 마스킹(*)되어 있습니다. 마스킹되기 전에(가급적 2주 이내) 정기 동기화로 선저장하는 것을 권장합니다.",
      });
    }

    const rawText = [
      `주문번호: ${o.orderId}`,
      o.orderedAt ? `주문일시: ${o.orderedAt}` : "",
      o.buyerName ? `이름: ${o.buyerName}` : "",
      o.phone ? `휴대폰: ${o.phone}` : "",
      o.email ? `이메일: ${o.email}` : "",
      o.address ? `주소: ${o.address}` : "",
      o.status ? `상태: ${o.status}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const contactKey = makeContactKey(o.phone, o.email) ?? `order:${o.orderId}`;

    // 1) contact_key 기준 업서트 (B: 고객 단위 갱신)
    const { error } = await supabase.from("customer_vault_entries" as any).upsert(
      {
        title: `${storeName.trim()} 주문 고객`,
        raw_text: rawText,
        buyer_name: o.buyerName ?? null,
        phone: normalizePhone(o.phone),
        email: normalizeEmail(o.email),
        address: o.address ?? null,
        order_id: o.orderId,
        ordered_at: o.orderedAt ? new Date(o.orderedAt).toISOString() : null,
        contact_key: contactKey,
        memo: null,
      },
      {
        onConflict: "user_id,contact_key",
      }
    );

    if (!error) return;

    // 2) 예외: 같은 order_id가 이미 다른 contact_key로 저장된 경우(유니크 인덱스 충돌)
    // → order_id 기준으로 해당 row를 찾아 update (내 데이터만 RLS로 업데이트 가능)
    if (String(error.message ?? "").includes("order_id") || String(error.message ?? "").includes("unique")) {
      const { error: updateError } = await supabase
        .from("customer_vault_entries" as any)
        .update({
          title: `${storeName.trim()} 주문 고객`,
          raw_text: rawText,
          buyer_name: o.buyerName ?? null,
          phone: normalizePhone(o.phone),
          email: normalizeEmail(o.email),
          address: o.address ?? null,
          ordered_at: o.orderedAt ? new Date(o.orderedAt).toISOString() : null,
          memo: null,
        })
        .eq("order_id", o.orderId);
      if (updateError) throw updateError;
      return;
    }

    throw error;
  };

  const handleQuery = async () => {
    if (!canQuery) {
      toast({
        title: "입력값이 필요합니다",
        description: "상점명과 조회 기간(시작/종료)을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const today = todayStr();
    if (dateTo > today) {
      toast({
        title: "종료일 오류",
        description: "종료일(to)은 오늘 이후로 설정할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    if (dateFrom > dateTo) {
      toast({
        title: "기간 오류",
        description: "시작일(from)이 종료일(to)보다 늦을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setRows([]);

    try {
      const { data, error } = await supabase.functions.invoke("naver-order-list", {
        body: { storeName: storeName.trim(), dateFrom, dateTo },
      });

      if (error) throw error;

      const items = Array.isArray((data as any)?.orders) ? ((data as any).orders as OrderRow[]) : [];
      setRows(items);

      if (autoSaveCustomers && items.length > 0) {
        try {
          // 너무 많은 호출을 피하기 위해 상위 N개만 저장 (초기값 100)
          const limit = Math.min(items.length, 100);
          for (const o of items.slice(0, limit)) {
            await saveCustomerFromOrder(o);
          }
          toast({
            title: "고객 저장소 업데이트",
            description: `주문 고객 정보를 ${limit}건 저장/갱신했습니다. (B: 중복은 갱신)`,
          });
        } catch (e: any) {
          toast({
            title: "고객 저장 실패",
            description: e?.message || "고객 저장소에 저장하는 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        }
      }

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
        <AlertTitle className="text-slate-700">2주 이후 마스킹 방지: “주문 고객”은 선저장하세요</AlertTitle>
        <AlertDescription className="text-slate-600">
          네이버 정책상 일정 기간이 지나면 전화번호/이메일이 *** 로 마스킹될 수 있습니다.
          따라서 (권장) 최근 기간을 매일 동기화해서 고객 저장소에 선저장하면 CS/마케팅에 필요한 정보를 보존할 수 있습니다.
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
          <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm font-semibold text-slate-700">전화/이메일 폴링(매일) 설정</div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={syncEnabled ? "default" : "outline"}
                  className={
                    syncEnabled
                      ? "bg-[#0F4C5C] hover:bg-[#0a3d4a] text-white"
                      : "border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                  }
                  onClick={() => setSyncEnabled((v) => !v)}
                  disabled={!canSaveSyncSettings}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  폴링: {syncEnabled ? "ON" : "OFF"}
                </Button>
                <div className="flex items-center gap-2">
                  <Label className="text-slate-600 text-sm">기본 기간</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={syncDays}
                    onChange={(e) => setSyncDays(Number(e.target.value))}
                    className="w-24 border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
                    disabled={!canSaveSyncSettings}
                  />
                  <span className="text-sm text-slate-600">일</span>
                </div>
                <Button
                  type="button"
                  onClick={saveSyncSettings}
                  disabled={!canSaveSyncSettings || isSavingSyncSettings}
                  className="bg-[#0F4C5C] hover:bg-[#0a3d4a] text-white"
                >
                  {isSavingSyncSettings ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      설정 저장
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              기본값은 <b>7일</b>이며, 마스킹(*)되기 전에 자동으로 고객 저장소에 선저장합니다.
            </p>
          </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                onClick={() => applyPreset(1)}
              >
                1일
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                onClick={() => applyPreset(7)}
              >
                1주일
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                onClick={() => applyPreset(30)}
              >
                1개월
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                onClick={() => applyPreset(90)}
              >
                3개월
              </Button>
              <Button
                type="button"
                variant={autoSaveCustomers ? "default" : "outline"}
                className={
                  autoSaveCustomers
                    ? "bg-[#0F4C5C] hover:bg-[#0a3d4a] text-white"
                    : "border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                }
                onClick={() => setAutoSaveCustomers((v) => !v)}
              >
                <Save className="h-4 w-4 mr-2" />
                고객 자동저장: {autoSaveCustomers ? "ON" : "OFF"}
              </Button>
            </div>

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
                max={todayStr()}
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
                    <div className="flex-1 text-sm text-slate-700">
                      {r.buyerName ?? "-"}
                      <div className="text-xs text-slate-500 mt-1">
                        {r.phone ? `📞 ${r.phone}${r.masked?.phone ? " (마스킹)" : ""}` : ""}
                        {r.email ? ` / ✉️ ${r.email}${r.masked?.email ? " (마스킹)" : ""}` : ""}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{r.address ? `🏠 ${r.address}` : ""}</div>
                    </div>
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


