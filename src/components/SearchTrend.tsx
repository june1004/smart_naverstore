import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, Hash } from "lucide-react";
import TrendAnalysis from "./TrendAnalysis";
import PopularKeywords from "./PopularKeywords";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyword } from "@/contexts/KeywordContext";
import LoginRequiredMessage from "./ui/LoginRequiredMessage";
import { useState } from "react";

const SearchTrend = () => {
  const { user } = useAuth();
  const { sharedKeyword } = useKeyword();
  const [activeTab, setActiveTab] = useState("analysis");

  if (!user) {
    return (
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-lg rounded-lg p-1">
            <TabsTrigger 
              value="analysis" 
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              트렌드 분석
            </TabsTrigger>
            <TabsTrigger 
              value="popular" 
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Hash className="h-4 w-4" />
              분야별 인기검색어
            </TabsTrigger>
          </TabsList>
          <TabsContent value="analysis">
            <LoginRequiredMessage
              title="로그인이 필요한 기능입니다"
              description="트렌드 분석 기능을 사용하려면 회원가입 또는 로그인해주세요."
              keyword={sharedKeyword}
              highlightColor="green"
            />
          </TabsContent>
          <TabsContent value="popular">
            <LoginRequiredMessage
              title="로그인이 필요한 기능입니다"
              description="분야별 인기검색어 기능을 사용하려면 회원가입 또는 로그인해주세요."
              highlightColor="orange"
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-lg rounded-lg p-1">
          <TabsTrigger 
            value="analysis" 
            className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            <BarChart3 className="h-4 w-4" />
            트렌드 분석
          </TabsTrigger>
          <TabsTrigger 
            value="popular" 
            className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Hash className="h-4 w-4" />
            분야별 인기검색어
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analysis" className="space-y-6">
          <TrendAnalysis />
        </TabsContent>
        <TabsContent value="popular" className="space-y-6">
          <PopularKeywords />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SearchTrend;
