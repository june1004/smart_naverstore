import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PackageSearch, Receipt, Users, TrendingUp } from "lucide-react";
import Logo from "@/components/Logo";
import UserProfile from "@/components/UserProfile";
import { ThemeToggle } from "@/components/ThemeToggle";
import SEOOptimization from "@/pages/SEOOptimization";
import StoreOrders from "@/components/store/StoreOrders";
import CustomerVault from "@/components/store/CustomerVault";
import SalesAdvisor from "@/components/store/SalesAdvisor";

const Store = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("product");
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
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">대시보드로</span>
          </Button>
          <Logo size="md" className="flex-shrink-0" />
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UserProfile />
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center space-y-2 px-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">스토어 관리</h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            상품 수정(SEO/상세/태그), 주문/결제 확인, 고객 저장소, 매출 상승 제안을 한 곳에서 관리하세요
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div 
            ref={scrollContainerRef}
            className="w-full overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0 mb-6"
          >
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-4 bg-card border border-[var(--brand-border)] shadow-sm rounded-xl p-1">
              <TabsTrigger
                value="product"
                className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all whitespace-nowrap flex-shrink-0 min-w-fit"
              >
                <PackageSearch className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">상품/SEO 수정</span>
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all whitespace-nowrap flex-shrink-0 min-w-fit"
              >
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">주문/결제</span>
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all whitespace-nowrap flex-shrink-0 min-w-fit"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">고객 저장소</span>
              </TabsTrigger>
              <TabsTrigger
                value="sales"
                className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all whitespace-nowrap flex-shrink-0 min-w-fit"
              >
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">매출/제안</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="product" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-card rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
                  <PackageSearch className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">상품명 · 태그 · 상세페이지(HTML) 수정</span>
                </CardTitle>
                <CardDescription className="text-white/90 text-xs sm:text-sm">
                  승인(심사완료) 후에는 AI 추천 내용을 스토어에 "원클릭 반영"할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <SEOOptimization />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <StoreOrders />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomerVault />
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <SalesAdvisor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Store;


