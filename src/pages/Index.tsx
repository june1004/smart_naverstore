import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import KeywordExtraction from "@/components/KeywordExtraction";
import KeywordSearch from "@/components/KeywordSearch";
import SearchTrend from "@/components/SearchTrend";
import ShoppingInsight from "@/components/ShoppingInsight";
import AutoKeywordAnalyzer from "@/components/AutoKeywordAnalyzer";
import ServiceManager from "@/components/ServiceManager";
import UserProfile from "@/components/UserProfile";
import { TrendingUp, BarChart3, Sparkles, Settings, Search, Store as StoreIcon, Lock } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const navigate = useNavigate();
  const { hasStoreAddon } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("auto-analyzer");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 탭 변경 시 해당 탭으로 스크롤
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const activeTrigger = scrollContainerRef.current.querySelector(
      `[data-state="active"]`
    ) as HTMLElement;
    
    if (activeTrigger) {
      const container = scrollContainerRef.current;
      const triggerRect = activeTrigger.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // 탭이 컨테이너 밖에 있으면 스크롤
      if (triggerRect.left < containerRect.left) {
        // 왼쪽으로 스크롤 (탭이 왼쪽에 잘림)
        container.scrollTo({
          left: container.scrollLeft + (triggerRect.left - containerRect.left) - 16,
          behavior: "smooth",
        });
      } else if (triggerRect.right > containerRect.right) {
        // 오른쪽으로 스크롤 (탭이 오른쪽에 잘림)
        container.scrollTo({
          left: container.scrollLeft + (triggerRect.right - containerRect.right) + 16,
          behavior: "smooth",
        });
      }
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--brand-bg-start)] via-background to-[var(--brand-bg-end)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--brand-border)] bg-background hover:bg-accent text-foreground text-xs sm:text-sm px-2 sm:px-4"
            onClick={() => {
              if (!hasStoreAddon) {
                toast({
                  title: "추가 구독이 필요합니다",
                  description: "스토어 관리는 '추가 구독(애드온)' 활성화 후 이용할 수 있어요.",
                  variant: "destructive",
                });
                navigate("/pricing?reason=store-addon");
                return;
              }
              navigate("/store");
            }}
          >
            <StoreIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">스토어관리</span>
            {!hasStoreAddon && <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:ml-2 text-muted-foreground" />}
          </Button>
          <Logo size="md" className="flex-shrink-0" />
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UserProfile />
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center space-y-2 px-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">키워드 분석 도구</h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            키워드 분석, 검색 트렌드, 쇼핑 인사이트를 통해 데이터 기반의 쇼핑몰 운영 전략을 수립하세요
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div 
            ref={scrollContainerRef}
            className="w-full overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0 mb-6"
          >
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5 bg-card border border-[var(--brand-border)] shadow-sm rounded-xl p-1">
              <TabsTrigger value="auto-analyzer" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all whitespace-nowrap flex-shrink-0 min-w-fit">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">AI 자동분석</span>
              </TabsTrigger>
              <TabsTrigger value="keyword" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all whitespace-nowrap flex-shrink-0 min-w-fit">
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">키워드 분석</span>
              </TabsTrigger>
              <TabsTrigger value="trend" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all whitespace-nowrap flex-shrink-0 min-w-fit">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">통합검색어 트렌드</span>
              </TabsTrigger>
              <TabsTrigger value="insight" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all whitespace-nowrap flex-shrink-0 min-w-fit">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">쇼핑인사이트</span>
              </TabsTrigger>
              <TabsTrigger value="service" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all whitespace-nowrap flex-shrink-0 min-w-fit">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">서비스 관리</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="auto-analyzer" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-card rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  AI 키워드 자동 분석
                </CardTitle>
                <CardDescription className="text-white/90 text-xs sm:text-sm">
                  키워드만 입력하면 AI가 자동으로 카테고리를 찾아 트렌드와 인사이트를 분석해드립니다 (회원가입 불필요)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <AutoKeywordAnalyzer />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keyword" className="space-y-6">
            <KeywordSearch />
          </TabsContent>

          <TabsContent value="trend" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-card rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  통합검색어 트렌드
                </CardTitle>
                <CardDescription className="text-white/90 text-xs sm:text-sm">
                  검색어별 트렌드 변화를 분석하여 시장 동향을 파악하세요 (로그인 필요)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <SearchTrend />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insight" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-card rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  쇼핑인사이트
                </CardTitle>
                <CardDescription className="text-white/90 text-xs sm:text-sm">
                  카테고리별 쇼핑 데이터와 인사이트를 통해 전략적 결정을 내리세요 (로그인 필요)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ShoppingInsight />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="service" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-card rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  서비스 관리
                </CardTitle>
                <CardDescription className="text-white/90 text-xs sm:text-sm">
                  네이버 API 설정과 카테고리 정보를 관리하세요 (로그인 필요)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ServiceManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
