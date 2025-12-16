import { useState } from "react";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--brand-bg-start)] via-background to-[var(--brand-bg-end)]">
      <div className="container mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="border-[var(--brand-border)] bg-background hover:bg-accent text-foreground"
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
            <StoreIcon className="h-4 w-4 mr-2" />
            스토어관리
            {!hasStoreAddon && <Lock className="h-3.5 w-3.5 ml-2 text-muted-foreground" />}
          </Button>
          <Logo size="md" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserProfile />
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">키워드 분석 도구</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            키워드 분석, 검색 트렌드, 쇼핑 인사이트를 통해 데이터 기반의 쇼핑몰 운영 전략을 수립하세요
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="auto-analyzer" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6 bg-card border border-[var(--brand-border)] shadow-sm rounded-xl p-1">
            <TabsTrigger value="auto-analyzer" className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all">
              <Sparkles className="h-4 w-4" />
              AI 자동분석
            </TabsTrigger>
            <TabsTrigger value="keyword" className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all">
              <Search className="h-4 w-4" />
              키워드 분석
            </TabsTrigger>
            <TabsTrigger value="trend" className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all">
              <TrendingUp className="h-4 w-4" />
              통합검색어 트렌드
            </TabsTrigger>
            <TabsTrigger value="insight" className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all">
              <BarChart3 className="h-4 w-4" />
              쇼핑인사이트
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-lg transition-all">
              <Settings className="h-4 w-4" />
              서비스 관리
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto-analyzer" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-card rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI 키워드 자동 분석
                </CardTitle>
                <CardDescription className="text-white/90">
                  키워드만 입력하면 AI가 자동으로 카테고리를 찾아 트렌드와 인사이트를 분석해드립니다 (회원가입 불필요)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AutoKeywordAnalyzer />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keyword" className="space-y-6">
            <KeywordSearch />
          </TabsContent>

          <TabsContent value="trend" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-card rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  통합검색어 트렌드
                </CardTitle>
                <CardDescription className="text-white/90">
                  검색어별 트렌드 변화를 분석하여 시장 동향을 파악하세요 (로그인 필요)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <SearchTrend />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insight" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-card rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  쇼핑인사이트
                </CardTitle>
                <CardDescription className="text-white/90">
                  카테고리별 쇼핑 데이터와 인사이트를 통해 전략적 결정을 내리세요 (로그인 필요)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ShoppingInsight />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="service" className="space-y-6">
            <Card className="shadow-sm border border-[var(--brand-border)] bg-card rounded-xl">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  서비스 관리
                </CardTitle>
                <CardDescription className="text-white/90">
                  네이버 API 설정과 카테고리 정보를 관리하세요 (로그인 필요)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
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
