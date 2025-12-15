import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Save, Trash2, Search, ShieldAlert } from "lucide-react";

type VaultRow = {
  id: string;
  created_at: string;
  title: string;
  raw_text: string;
  buyer_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  order_id: string | null;
  ordered_at: string | null;
  memo: string | null;
};

function parseContact(raw: string) {
  const phone = raw.match(/(01[016789][- ]?\d{3,4}[- ]?\d{4})/);
  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  // 아주 단순 추정: "이름:" 또는 "구매자:" 같은 키가 있으면 사용, 없으면 첫 줄을 이름 후보로 사용
  const nameMatch =
    raw.match(/(?:이름|구매자|수령인)\s*[:：]\s*([^\n\r]+)/) ??
    raw.match(/^(.*?)(?:\n|\r|$)/);

  const buyerName = (nameMatch?.[1] ?? "").trim() || null;
  return { phone: phone?.[1]?.replace(/\s+/g, "") ?? null, email: email?.[0] ?? null, buyerName };
}

function normalizePhone(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits || null;
}

function makeContactKey(phone: string | null, email: string | null, orderId: string | null) {
  const p = normalizePhone(phone);
  if (p) return `phone:${p}`;
  const e = (email ?? "").trim().toLowerCase();
  if (e) return `email:${e}`;
  const oid = (orderId ?? "").trim();
  if (oid) return `order:${oid}`;
  return null;
}

const CustomerVault = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [memo, setMemo] = useState("");
  const [orderedAt, setOrderedAt] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<VaultRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        (r.buyer_name ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.address ?? "").toLowerCase().includes(q) ||
        (r.order_id ?? "").toLowerCase().includes(q) ||
        r.raw_text.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer_vault_entries" as any)
        .select("id, created_at, title, raw_text, buyer_name, phone, email, address, order_id, ordered_at, memo")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows((data ?? []) as VaultRow[]);
    } catch (e: any) {
      toast({
        title: "고객 저장소 로드 실패",
        description:
          e?.message ||
          "테이블이 아직 없을 수 있습니다. (아래 SQL 마이그레이션 적용 후 다시 시도해주세요.)",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!rawText.trim()) {
      toast({ title: "내용이 필요합니다", description: "복사한 텍스트를 붙여넣어 주세요.", variant: "destructive" });
      return;
    }
    const derivedTitle = title.trim() || "고객 메모";
    const parsed = parseContact(rawText);
    const oid = orderId.trim() || null;
    const contactKey = makeContactKey(parsed.phone, parsed.email, oid);

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("customer_vault_entries" as any)
        .upsert(
          {
            title: derivedTitle,
            raw_text: rawText,
            buyer_name: parsed.buyerName,
            phone: normalizePhone(parsed.phone),
            email: parsed.email ? parsed.email.trim().toLowerCase() : null,
            address: address.trim() || null,
            order_id: oid,
            ordered_at: orderedAt ? new Date(orderedAt).toISOString() : null,
            contact_key: contactKey,
            memo: memo.trim() || null,
          },
          {
            // (B) 중복 정책: 같은 contact_key는 갱신
            // contact_key가 null이면 중복 체크를 하지 않고 항상 신규 row로 저장됩니다.
            onConflict: "user_id,contact_key",
          }
        );
      if (error) throw error;

      toast({
        title: "저장 완료",
        description: contactKey ? "기존 고객을 갱신(업데이트)했습니다." : "새 고객 메모를 추가했습니다.",
      });
      setTitle("");
      setRawText("");
      setMemo("");
      setOrderedAt("");
      setAddress("");
      setOrderId("");
      await load();
    } catch (e: any) {
      toast({
        title: "저장 실패",
        description:
          e?.message ||
          "저장 중 오류가 발생했습니다. (마이그레이션 적용 여부 + UPDATE RLS policy + unique index를 확인해주세요.)",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async (r: VaultRow) => {
    try {
      await navigator.clipboard.writeText(r.raw_text);
      toast({ title: "복사 완료", description: "원문을 클립보드에 복사했습니다." });
    } catch {
      toast({ title: "복사 실패", description: "브라우저 권한을 확인해주세요.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("customer_vault_entries" as any).delete().eq("id", id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "삭제 완료", description: "저장소에서 제거했습니다." });
    } catch (e: any) {
      toast({ title: "삭제 실패", description: e?.message || "삭제 중 오류", variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-sm border border-[var(--brand-border)] bg-white rounded-xl">
      <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          고객(구매자) 저장소
        </CardTitle>
        <CardDescription className="text-slate-100">
          주문/문의 화면에서 구매자 정보를 복사해 붙여넣고, 내 계정에만 따로 저장·검색·복사할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700">제목</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 12/14 구매자 문의"
                className="border-[var(--brand-border)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-700">주문일시</Label>
                <Input
                  type="datetime-local"
                  value={orderedAt}
                  onChange={(e) => setOrderedAt(e.target.value)}
                  className="border-[var(--brand-border)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">주문번호(선택)</Label>
                <Input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="예: 20251214-000001"
                  className="border-[var(--brand-border)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">주소</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="예: 서울시 …"
                  className="border-[var(--brand-border)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">복사한 원문</Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="구매자 정보/주문 정보/문의 내용을 그대로 붙여넣으세요 (필요한 부분만 저장하는 것도 가능)"
                className="min-h-[180px] border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
              />
              <p className="text-xs text-slate-500">
                자동 추출(휴대폰/이메일/이름)은 단순 규칙 기반입니다. 필요하면 메모에 보완해 주세요.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">메모(선택)</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 배송 요청사항, CS 히스토리, 교환/환불 여부 등"
                className="min-h-[90px] border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-[#E2D9C8] bg-white hover:bg-slate-50"
                onClick={load}
                disabled={isLoading}
              >
                새로고침
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-3)] text-white">
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="제목/이름/휴대폰/이메일/내용 검색"
                  className="pl-9 border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
                />
              </div>
              <Badge variant="outline" className="border-[var(--brand-primary)]/30 text-[var(--brand-primary)]">
                {filtered.length}건
              </Badge>
            </div>

            <Separator className="bg-slate-200" />

            <div className="border border-[var(--brand-border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#F0F9F8] text-sm font-semibold text-slate-700">저장 목록</div>
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-slate-600">
                  저장된 항목이 없습니다. (처음이면 DB 마이그레이션 적용이 필요할 수 있어요)
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                  {filtered.map((r) => (
                    <div key={r.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-700 truncate">{r.title}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(r.created_at).toLocaleString("ko-KR")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="border-[var(--brand-border)]" onClick={() => handleCopy(r)}>
                            <Copy className="h-4 w-4 mr-1" />
                            복사
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(r.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {r.buyer_name && (
                          <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white">
                            이름: {r.buyer_name}
                          </Badge>
                        )}
                        {r.phone && (
                          <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white">
                            휴대폰: {r.phone}
                          </Badge>
                        )}
                        {r.email && (
                          <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white">
                            이메일: {r.email}
                          </Badge>
                        )}
                      {r.address && (
                        <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white">
                          주소: {r.address}
                        </Badge>
                      )}
                      {r.ordered_at && (
                        <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white">
                          주문일시: {new Date(r.ordered_at).toLocaleString("ko-KR")}
                        </Badge>
                      )}
                      {r.order_id && (
                        <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white">
                          주문번호: {r.order_id}
                        </Badge>
                      )}
                      </div>

                      {r.memo && <div className="text-sm text-slate-600 whitespace-pre-wrap">{r.memo}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerVault;


