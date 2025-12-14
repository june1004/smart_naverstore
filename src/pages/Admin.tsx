import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import UserProfile from "@/components/UserProfile";
import { ArrowLeft, Users, Activity, BarChart3, Shield, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  username: string | null;
  is_super_admin?: boolean | null;
  is_paid_subscriber?: boolean;
  store_addon_active?: boolean;
  created_at?: string;
};

type PollingRunRow = {
  id: string;
  created_at: string;
  store_name: string;
  status: "success" | "error" | string;
  upserted: number;
  duration_ms: number | null;
  sync_days: number;
  error_text: string | null;
};

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const [query, setQuery] = useState("");
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [pollingRuns, setPollingRuns] = useState<PollingRunRow[]>([]);
  const [stats, setStats] = useState<null | {
    totalUsers: number;
    paidUsers: number;
    storeAddonUsers: number;
    totalCustomerVault: number;
    last24hPollingSuccess: number;
    last24hPollingFail: number;
  }>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const hay = [
        p.full_name ?? "",
        p.company_name ?? "",
        p.username ?? "",
        p.id ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [profiles, query]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void loadProfiles();
    void loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const loadProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("id,full_name,company_name,username,is_super_admin,is_paid_subscriber,store_addon_active,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setProfiles((data ?? []) as ProfileRow[]);
    } catch (e: any) {
      toast({
        title: "회원 목록 불러오기 실패",
        description: e?.message || "profiles RLS/컬럼 적용 여부를 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const toggleFlag = async (userId: string, key: "is_paid_subscriber" | "store_addon_active", next: boolean) => {
    try {
      const { error } = await supabase.from("profiles" as any).update({ [key]: next }).eq("id", userId);
      if (error) throw error;
      setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, [key]: next } : p)));
    } catch (e: any) {
      toast({
        title: "업데이트 실패",
        description: e?.message || "권한 또는 마이그레이션 적용 여부를 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  const loadHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [{ count: totalUsers }, { count: paidUsers }, { count: storeAddonUsers }, { count: totalCustomerVault }] =
        await Promise.all([
          supabase.from("profiles" as any).select("id", { count: "exact", head: true }),
          supabase.from("profiles" as any).select("id", { count: "exact", head: true }).eq("is_paid_subscriber", true),
          supabase.from("profiles" as any).select("id", { count: "exact", head: true }).eq("store_addon_active", true),
          supabase.from("customer_vault_entries" as any).select("id", { count: "exact", head: true }),
        ]);

      const { data: runs, error: runsErr } = await supabase
        .from("polling_runs" as any)
        .select("id,created_at,store_name,status,upserted,duration_ms,sync_days,error_text")
        .order("created_at", { ascending: false })
        .limit(50);
      if (runsErr) throw runsErr;

      const runsTyped = (runs ?? []) as PollingRunRow[];
      const last24h = runsTyped.filter((r) => r.created_at >= since);
      const last24hPollingSuccess = last24h.filter((r) => r.status === "success").length;
      const last24hPollingFail = last24h.filter((r) => r.status !== "success").length;

      setPollingRuns(runsTyped);
      setStats({
        totalUsers: Number(totalUsers ?? 0),
        paidUsers: Number(paidUsers ?? 0),
        storeAddonUsers: Number(storeAddonUsers ?? 0),
        totalCustomerVault: Number(totalCustomerVault ?? 0),
        last24hPollingSuccess,
        last24hPollingFail,
      });
    } catch (e: any) {
      toast({
        title: "헬스/통계 로드 실패",
        description: e?.message || "polling_runs 마이그레이션 적용 여부를 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHealth(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F0F9F8] via-white to-[#E6F4F1] flex items-center justify-center px-6">
        <Card className="max-w-lg w-full border border-[#E2D9C8] bg-white shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <Shield className="h-5 w-5 text-amber-600" />
              접근 제한
            </CardTitle>
            <CardDescription className="text-slate-600">
              관리자 페이지는 <b>수퍼관리자</b>만 접근할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Button
              variant="outline"
              className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
              onClick={() => navigate("/dashboard")}
            >
              대시보드로
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F9F8] via-white to-[#E6F4F1]">
      <div className="container mx-auto px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            대시보드로
          </Button>
          <Logo size="md" />
          <UserProfile />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-700">관리자</h1>
          <p className="text-slate-600">회원관리 · 시스템 헬스 · 자주 쓰는 통계를 한 곳에서 관리합니다</p>
        </div>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-[#E2D9C8] shadow-sm rounded-xl p-1">
            <TabsTrigger
              value="members"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-[#0F4C5C] data-[state=active]:text-white rounded-lg transition-all"
            >
              <Users className="h-4 w-4" />
              회원관리
            </TabsTrigger>
            <TabsTrigger
              value="health"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-[#0F4C5C] data-[state=active]:text-white rounded-lg transition-all"
            >
              <Activity className="h-4 w-4" />
              헬스/모니터링
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-[#0F4C5C] data-[state=active]:text-white rounded-lg transition-all"
            >
              <BarChart3 className="h-4 w-4" />
              자주쓰는 통계
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <Card className="shadow-sm border border-[#E2D9C8] bg-white rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[#0F4C5C] to-[#1a6b7a] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  회원 관리(권한/구독)
                </CardTitle>
                <CardDescription className="text-slate-100">
                  기본 구독(is_paid_subscriber)과 스토어관리 애드온(store_addon_active)을 토글로 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                  <Input
                    placeholder="이름/회사/username/user_id 검색"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
                  />
                  <Button
                    onClick={loadProfiles}
                    variant="outline"
                    className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                    disabled={isLoadingProfiles}
                  >
                    {isLoadingProfiles ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        불러오는 중...
                      </>
                    ) : (
                      <>새로고침</>
                    )}
                  </Button>
                </div>

                <div className="border border-[#E2D9C8] rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-[#F0F9F8] text-sm font-semibold text-slate-700">
                    회원 ({filtered.length})
                  </div>
                  {filtered.length === 0 ? (
                    <div className="p-6 text-sm text-slate-600">표시할 회원이 없습니다.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filtered.map((p) => (
                        <div key={p.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-semibold text-slate-700 truncate">
                                {p.full_name ?? "이름 없음"}
                              </div>
                              {p.is_super_admin ? (
                                <Badge className="bg-[#0F4C5C] text-white">SUPER</Badge>
                              ) : null}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 truncate">{p.id}</div>
                            <div className="text-sm text-slate-600 mt-1">
                              {p.company_name ?? "-"} / {p.username ?? "-"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Button
                              type="button"
                              variant={p.is_paid_subscriber ? "default" : "outline"}
                              className={
                                p.is_paid_subscriber
                                  ? "bg-[#0F4C5C] hover:bg-[#0a3d4a] text-white"
                                  : "border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                              }
                              onClick={() => toggleFlag(p.id, "is_paid_subscriber", !(p.is_paid_subscriber === true))}
                            >
                              {p.is_paid_subscriber ? (
                                <ToggleRight className="h-4 w-4 mr-2" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 mr-2" />
                              )}
                              기본구독
                            </Button>
                            <Button
                              type="button"
                              variant={p.store_addon_active ? "default" : "outline"}
                              className={
                                p.store_addon_active
                                  ? "bg-[#0F4C5C] hover:bg-[#0a3d4a] text-white"
                                  : "border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                              }
                              onClick={() => toggleFlag(p.id, "store_addon_active", !(p.store_addon_active === true))}
                              disabled={!p.is_paid_subscriber}
                            >
                              {p.store_addon_active ? (
                                <ToggleRight className="h-4 w-4 mr-2" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 mr-2" />
                              )}
                              스토어애드온
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <Card className="shadow-sm border border-[#E2D9C8] bg-white rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[#0F4C5C] to-[#1a6b7a] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  시스템 헬스/모니터링
                </CardTitle>
                <CardDescription className="text-slate-100">
                  폴링 실행 결과(성공/실패)와 최근 상태를 확인합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-end">
                  <Button
                    onClick={loadHealth}
                    variant="outline"
                    className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700"
                    disabled={isLoadingHealth}
                  >
                    {isLoadingHealth ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        불러오는 중...
                      </>
                    ) : (
                      <>새로고침</>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                    <div className="text-xs text-slate-500">최근 24h 폴링 성공</div>
                    <div className="text-2xl font-bold text-slate-700">{stats?.last24hPollingSuccess ?? "-"}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                    <div className="text-xs text-slate-500">최근 24h 폴링 실패</div>
                    <div className="text-2xl font-bold text-slate-700">{stats?.last24hPollingFail ?? "-"}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                    <div className="text-xs text-slate-500">총 회원</div>
                    <div className="text-2xl font-bold text-slate-700">{stats?.totalUsers ?? "-"}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                    <div className="text-xs text-slate-500">총 고객 저장</div>
                    <div className="text-2xl font-bold text-slate-700">{stats?.totalCustomerVault ?? "-"}</div>
                  </div>
                </div>

                <div className="border border-[#E2D9C8] rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-[#F0F9F8] text-sm font-semibold text-slate-700">
                    최근 폴링 실행 ({pollingRuns.length})
                  </div>
                  {pollingRuns.length === 0 ? (
                    <div className="p-6 text-sm text-slate-600">
                      아직 기록이 없습니다. (먼저 `polling_runs` 마이그레이션 적용 후 폴링이 한 번이라도 실행되어야 합니다)
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {pollingRuns.map((r) => (
                        <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-2">
                          <div className="text-xs text-slate-500 font-mono">{r.created_at}</div>
                          <div className="flex-1 text-sm text-slate-700">{r.store_name}</div>
                          <div className="text-sm text-slate-700 font-semibold">{r.upserted}건</div>
                          <div className="text-xs text-slate-600">{r.duration_ms ? `${r.duration_ms}ms` : "-"}</div>
                          <Badge className={r.status === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
                            {r.status === "success" ? "성공" : "실패"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card className="shadow-sm border border-[#E2D9C8] bg-white rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[#0F4C5C] to-[#1a6b7a] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  자주 쓰는 통계
                </CardTitle>
                <CardDescription className="text-slate-100">
                  운영에 자주 필요한 숫자만 요약합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                    <div className="text-xs text-slate-500">기본 구독 회원</div>
                    <div className="text-2xl font-bold text-slate-700">{stats?.paidUsers ?? "-"}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                    <div className="text-xs text-slate-500">스토어 애드온 회원</div>
                    <div className="text-2xl font-bold text-slate-700">{stats?.storeAddonUsers ?? "-"}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                    <div className="text-xs text-slate-500">총 고객 저장</div>
                    <div className="text-2xl font-bold text-slate-700">{stats?.totalCustomerVault ?? "-"}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  더 많은 통계(최근 7일 분석 수 등)는 다음 단계에서 “관리자 전용 집계 함수/뷰”로 확장합니다.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;


