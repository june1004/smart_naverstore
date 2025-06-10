import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import KeywordSearch from "@/components/KeywordSearch";
import SearchTrend from "@/components/SearchTrend";
import ShoppingInsight from "@/components/ShoppingInsight";
import AutoKeywordAnalyzer from "@/components/AutoKeywordAnalyzer";
import { ShoppingCart, TrendingUp, BarChart3, Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <ShoppingCart className="h-10 w-10 text-blue-600" />
            네이버 쇼핑몰 분석 도구
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            키워드 분석, 검색 트렌드, 쇼핑 인사이트를 통해 데이터 기반의 쇼핑몰 운영 전략을 수립하세요
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="auto-analyzer" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-white shadow-lg rounded-lg p-1">
            <TabsTrigger 
              value="auto-analyzer" 
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Sparkles className="h-4 w-4" />
              AI 자동분석
            </TabsTrigger>
            <TabsTrigger 
              value="keyword" 
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              키워드 조회
            </TabsTrigger>
            <TabsTrigger 
              value="trend" 
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              <TrendingUp className="h-4 w-4" />
              통합검색어 트렌드
            </TabsTrigger>
            <TabsTrigger 
              value="insight" 
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              쇼핑인사이트
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto-analyzer" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI 키워드 자동 분석
                </CardTitle>
                <CardDescription className="text-purple-100">
                  키워드만 입력하면 AI가 자동으로 카테고리를 찾아 트렌드와 인사이트를 분석해드립니다
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AutoKeywordAnalyzer />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keyword" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  키워드 조회
                </CardTitle>
                <CardDescription className="text-blue-100">
                  네이버 쇼핑 검색 결과를 분석하여 상품 정보와 판매 데이터를 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <KeywordSearch />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  통합검색어 트렌드
                </CardTitle>
                <CardDescription className="text-green-100">
                  검색어별 트렌드 변화를 분석하여 시장 동향을 파악하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <SearchTrend />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insight" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  쇼핑인사이트
                </CardTitle>
                <CardDescription className="text-purple-100">
                  카테고리별 쇼핑 데이터와 인사이트를 통해 전략적 결정을 내리세요
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ShoppingInsight />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
