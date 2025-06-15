
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, BarChart3, TrendingUp } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import KeywordInputSection from "./analyzer/KeywordInputSection";
import CategoryAnalysisTable from "./analyzer/CategoryAnalysisTable";
import SearchStatsChart from "./analyzer/SearchStatsChart";
import InsightsCharts from "./analyzer/InsightsCharts";
import DemographicCharts from "./analyzer/DemographicCharts";
import AnalysisSummary from "./analyzer/AnalysisSummary";

interface AnalysisResult {
  keyword: string;
  categoryAnalysis: {
    totalItems: number;
    recommendedCategories: Array<{
      name: string;
      code: string;
      level1: string;
      level2: string;
      level3: string;
      count: number;
      percentage: string;
      hasRealCategory?: boolean;
      realCategoryId?: string;
      realCategoryPath?: string;
    }>;
  };
  insights: Array<{
    category: any;
    insight: {
      title: string;
      results: Array<{
        title: string;
        data: Array<{
          period: string;
          ratio: number;
        }>;
      }>;
    };
  }>;
  monthlySearchStats: {
    keyword: string;
    monthlyData: Array<{
      period: string;
      ratio: number;
    }>;
    competitiveness: string;
    validity: string;
  };
  priceAnalysis: Array<{
    range: string;
    count: number;
    percentage: string;
  }>;
  clickTrends: Array<{
    period: string;
    ratio: number;
  }>;
  demographicAnalysis: {
    age: Array<{ range: string; percentage: number }>;
    gender: Array<{ type: string; percentage: number }>;
    device: Array<{ type: string; percentage: number }>;
  };
}

const AutoKeywordAnalyzer = () => {
  const { analysisResult, isAnalysisValid } = useAnalysis();

  const handleAnalysisComplete = (data: AnalysisResult) => {
    console.log('분석 완료:', data);
  };

  // 페이지 로드 시 유효한 분석 결과가 있으면 키워드만 표시 (값은 설정하지 않음)
  useEffect(() => {
    if (analysisResult && isAnalysisValid()) {
      // 키워드 입력창은 비워두되, 분석 결과는 유지
    }
  }, [analysisResult, isAnalysisValid]);

  return (
    <div className="space-y-6">
      {/* 키워드 입력 및 분석 */}
      <KeywordInputSection onAnalysisComplete={handleAnalysisComplete} />

      {/* 분석 결과 */}
      {analysisResult && isAnalysisValid() && (
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              카테고리 & 검색량
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              인사이트 차트
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              트렌드 분석
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            {/* 키워드 및 카테고리 분석 */}
            <CategoryAnalysisTable
              keyword={analysisResult.keyword}
              totalItems={analysisResult.categoryAnalysis?.totalItems || 0}
              categories={analysisResult.categoryAnalysis?.recommendedCategories || []}
            />

            {/* 월별 검색량과 경쟁률 */}
            <SearchStatsChart monthlySearchStats={analysisResult.monthlySearchStats} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <InsightsCharts
              priceAnalysis={analysisResult.priceAnalysis || []}
              clickTrends={analysisResult.clickTrends || []}
            />
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {/* 연령/성별/기기별 검색 패턴 분석 */}
            <DemographicCharts demographicAnalysis={analysisResult.demographicAnalysis} />

            {/* 종합 분석 요약 */}
            <AnalysisSummary
              totalItems={analysisResult.categoryAnalysis?.totalItems || 0}
              categoriesCount={(analysisResult.categoryAnalysis?.recommendedCategories || []).length}
              competitiveness={analysisResult.monthlySearchStats?.competitiveness || 'N/A'}
              mainCategoryPercentage={analysisResult.categoryAnalysis?.recommendedCategories?.[0]?.percentage || '0'}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* 로딩 상태는 KeywordInputSection에서 처리됨 */}
    </div>
  );
};

export default AutoKeywordAnalyzer;
