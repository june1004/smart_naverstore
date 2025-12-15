import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PackageSearch, Receipt, Users, TrendingUp } from "lucide-react";
import Logo from "@/components/Logo";
import UserProfile from "@/components/UserProfile";
import SEOOptimization from "@/pages/SEOOptimization";
import StoreOrders from "@/components/store/StoreOrders";
import CustomerVault from "@/components/store/CustomerVault";
import SalesAdvisor from "@/components/store/SalesAdvisor";

const Store = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--brand-bg-start)] via-white to-[var(--brand-bg-end)]">
      <div className="container mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
              className="border-[var(--brand-border)] bg-white hover:bg-slate-50 text-slate-700"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            대시보드로
          </Button>
          <Logo size="md" />
          <UserProfile />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-700">스토어 관리</h1>
          <p className="text-slate-600">
            상품 수정(SEO/상세/태그), 주문/결제 확인, 고객 저장소, 매출 상승 제안을 한 곳에서 관리하세요
          </p>
        </div>

        <Tabs defaultValue="product" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 bg-white border border-[var(--brand-border)] shadow-sm rounded-xl p-1">
            <TabsTrigger
              value="product"
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all"
            >
              <PackageSearch className="h-4 w-4" />
              상품/SEO 수정
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all"
            >
              <Receipt className="h-4 w-4" />
              주문/결제
            </TabsTrigger>
            <TabsTrigger
              value="customers"
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all"
            >
              <Users className="h-4 w-4" />
              고객 저장소
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all"
            >
              <TrendingUp className="h-4 w-4" />
              매출/제안
            </TabsTrigger>
          </TabsList>

          <TabsContent value="product" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-white rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <PackageSearch className="h-5 w-5" />
                  상품명 · 태그 · 상세페이지(HTML) 수정
                </CardTitle>
                <CardDescription className="text-slate-100">
                  승인(심사완료) 후에는 AI 추천 내용을 스토어에 “원클릭 반영”할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
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


