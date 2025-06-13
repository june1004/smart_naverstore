
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, Hash } from "lucide-react";
import TrendAnalysis from "./TrendAnalysis";
import PopularKeywords from "./PopularKeywords";

const SearchTrend = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="analysis" className="w-full">
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
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                키워드 트렌드 분석
              </CardTitle>
              <CardDescription className="text-green-100">
                여러 키워드의 검색 트렌드를 비교 분석하여 시장 동향을 파악하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <TrendAnalysis />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popular" className="space-y-6">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                분야별 인기 검색어
              </CardTitle>
              <CardDescription className="text-purple-100">
                네이버 쇼핑에서 가장 인기 있는 검색어를 분야별로 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <PopularKeywords />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SearchTrend;
