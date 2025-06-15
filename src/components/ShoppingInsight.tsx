
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { BarChart3, TrendingUp, Search, Calendar, Loader2, Target, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyword } from "@/contexts/KeywordContext";

interface InsightData {
  period: string;
  ratio: number;
}

interface CategoryAnalysis {
  mainCategory: [string, number] | null;
  allCategories: [string, number][];
}

const ShoppingInsight = () => {
  const { user } = useAuth();
  const { sharedKeyword } = useKeyword();
  const [keyword, setKeyword] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"1month" | "3months" | "1year">("1month");
  const [insightData, setInsightData] = useState<InsightData[]>([]);
  const [categoryAnalysis, setCategoryAnalysis] = useState<CategoryAnalysis | null>(null);
  const [foundCategory, setFoundCategory] = useState("");
  const [analysisType, setAnalysisType] = useState<"category" | "keyword">("category");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // AI 자동분석에서 공유된 키워드로 초기화
  useEffect(() => {
    if (sharedKeyword && !keyword) {
      setKeyword(sharedKeyword);
    }
  }, [sharedKeyword, keyword]);

  const periodOptions = [
    { value: "1month", label: "1개월", months: 1 },
    { value: "3months", label: "3개월", months: 3 },
    { value: "1year", label: "1년", months: 12 }
  ];

  const getDateRange = (months: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);
    
    return {
      startDate: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
      endDate: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    };
  };

  const analyzeKeywordInsight = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "회원가입 또는 로그인 후 이용해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!keyword.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "분석할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1단계: 키워드로 카테고리 찾기
      const { data: categoryData, error: categoryError } = await supabase.functions.invoke('auto-category-finder', {
        body: { keyword: keyword.trim() }
      });

      if (categoryError) throw new Error(categoryError.message);

      setFoundCategory(categoryData.suggestedCategory || "키워드 분석");
      setCategoryAnalysis(categoryData.categoryAnalysis);
      setAnalysisType(categoryData.useKeywordAnalysis ? "keyword" : "category");

      // 2단계: 인사이트 분석
      const selectedPeriodOption = periodOptions.find(p => p.value === selectedPeriod);
      const { startDate, endDate } = getDateRange(selectedPeriodOption?.months || 1);

      const { data: insightData, error: insightError } = await supabase.functions.invoke('naver-shopping-insight', {
        body: {
          category: categoryData.suggestedCategory,
          keyword: keyword.trim(),
          startDate,
          endDate,
          timeUnit: 'month',
          device: '',
          ages: [],
          gender: '',
          useKeywordAnalysis: categoryData.useKeywordAnalysis
        }
      });

      if (insightError) throw new Error(insightError.message);

      // 응답 데이터 구조에 따라 처리
      let processedData = [];
      if (insightData.results && insightData.results.length > 0) {
        processedData = insightData.results[0].data || [];
      } else if (insightData.data) {
        processedData = insightData.data;
      }

      setInsightData(processedData);
      
      toast({
        title: "인사이트 분석 완료",
        description: `"${keyword}" 키워드의 ${selectedPeriodOption?.label} 인사이트 분석이 완료되었습니다.`,
      });

    } catch (error) {
      console.error('인사이트 분석 오류:', error);
      
      // 에러 발생 시 키워드 기반 분석으로 재시도
      try {
        console.log('키워드 기반 분석으로 재시도...');
        const selectedPeriodOption = periodOptions.find(p => p.value === selectedPeriod);
        const { startDate, endDate } = getDateRange(selectedPeriodOption?.months || 1);

        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('naver-shopping-insight', {
          body: {
            keyword: keyword.trim(),
            startDate,
            endDate,
            timeUnit: 'month',
            device: '',
            ages: [],
            gender: '',
            useKeywordAnalysis: true
          }
        });

        if (fallbackError) throw new Error(fallbackError.message);

        let processedData = [];
        if (fallbackData.results && fallbackData.results.length > 0) {
          processedData = fallbackData.results[0].data || [];
        }

        setInsightData(processedData);
        setAnalysisType("keyword");
        setFoundCategory("키워드 분석");
        
        toast({
          title: "키워드 분석 완료",
          description: `"${keyword}" 키워드 트렌드 분석이 완료되었습니다.`,
        });

      } catch (fallbackError) {
        console.error('키워드 분석도 실패:', fallbackError);
        toast({
          title: "분석 실패",
          description: "인사이트 분석 중 오류가 발생했습니다. 다른 키워드로 시도해보세요.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 기기별/성별/연령별 데이터 (실제로는 API에서 받아와야 함)
  const deviceData = [
    { name: '모바일', value: 77, color: '#10b981' },
    { name: 'PC', value: 23, color: '#f59e0b' }
  ];

  const genderData = [
    { name: '여성', value: 70, color: '#ef4444' },
    { name: '남성', value: 30, color: '#3b82f6' }
  ];

  const ageData = [
    { age: '10대', value: 90 },
    { age: '20대', value: 85 },
    { age: '30대', value: 70 },
    { age: '40대', value: 45 },
    { age: '50대', value: 25 },
    { age: '60대+', value: 10 }
  ];

  // 로그인하지 않은 사용자를 위한 안내 컴포넌트
  const LoginRequiredMessage = () => (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-6 text-center">
        <User className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-orange-700 mb-2">로그인이 필요한 기능입니다</h3>
        <p className="text-orange-600 mb-4">
          쇼핑인사이트 기능을 사용하려면 회원가입 또는 로그인해주세요.
        </p>
        {sharedKeyword && (
          <div className="bg-white p-3 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-orange-700">
              <Search className="h-4 w-4" />
              <span className="font-medium">AI 자동분석에서 전달된 키워드:</span>
            </div>
            <p className="text-lg font-bold text-orange-800 mt-1">"{sharedKeyword}"</p>
            <p className="text-sm text-orange-600 mt-2">로그인 후 이 키워드로 인사이트 분석을 진행할 수 있습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 로그인하지 않은 경우 안내 메시지만 표시
  if (!user) {
    return (
      <div className="space-y-6">
        <LoginRequiredMessage />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI 자동분석에서 전달된 키워드 안내 */}
      {sharedKeyword && (
        <Alert>
          <Search className="h-4 w-4" />
          <AlertDescription>
            AI 자동분석에서 전달된 키워드 "<strong>{sharedKeyword}</strong>"로 인사이트 분석을 진행할 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 키워드 기반 인사이트 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            키워드 기반 카테고리 자동 선택
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="분석할 키워드를 입력하세요 (예: 프라이팬)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyzeKeywordInsight()}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* 쇼핑인사이트 분석 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            쇼핑인사이트 분석 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 기간 선택 */}
          <div>
            <label className="text-sm font-medium mb-3 block">분석 기간</label>
            <div className="flex gap-2">
              {periodOptions.map((period) => (
                <Button
                  key={period.value}
                  variant={selectedPeriod === period.value ? "default" : "outline"}
                  onClick={() => setSelectedPeriod(period.value as "1month" | "3months" | "1year")}
                  className="flex-1"
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={analyzeKeywordInsight} 
            disabled={loading || !keyword.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                인사이트 분석 중...
              </>
            ) : (
              "인사이트 분석"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 카테고리 분석 결과 */}
      {categoryAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              카테고리 분석 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryAnalysis.mainCategory && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">주요 카테고리:</span>
                  <Badge variant="default" className="bg-purple-600 text-white">
                    {categoryAnalysis.mainCategory[0]} ({categoryAnalysis.mainCategory[1]}개 상품)
                  </Badge>
                </div>
              </div>
            )}
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="category-analysis">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    상세 카테고리 분석 보기
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 mb-3">카테고리별 상품 분포</h4>
                    <div className="grid gap-3">
                      {(categoryAnalysis.allCategories || []).slice(0, 10).map(([categoryPath, count], index) => {
                        const pathParts = categoryPath.split('>').map(part => part.trim()).filter(part => part !== '');
                        const [large, medium, small] = pathParts;
                        
                        return (
                          <div key={index} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <Badge 
                                variant={index === 0 ? "default" : "secondary"} 
                                className={`${index === 0 ? "bg-purple-600 text-white" : ""} text-xs`}
                              >
                                #{index + 1}
                              </Badge>
                              <span className="font-semibold text-purple-600">{count}개 상품</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">대분류:</span>
                                <span className="font-medium text-blue-600">{large || '-'}</span>
                              </div>
                              {medium && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">중분류:</span>
                                  <span className="font-medium text-green-600">{medium}</span>
                                </div>
                              )}
                              {small && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">소분류:</span>
                                  <span className="font-medium text-orange-600">{small}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(categoryAnalysis.allCategories || []).length > 10 && (
                      <div className="text-center pt-3 border-t">
                        <Badge variant="outline" className="text-xs">
                          +{(categoryAnalysis.allCategories || []).length - 10}개 카테고리 더 있음
                        </Badge>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* 분석 결과 */}
      {insightData.length > 0 && (
        <div className="space-y-6">
          {/* 분석 기간 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                "{keyword}" 키워드 분석 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">분석 키워드:</span> {keyword}
                </div>
                <div>
                  <span className="font-medium">분석 기간:</span> {periodOptions.find(p => p.value === selectedPeriod)?.label}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">분석 방식:</span> 
                  <Badge variant={analysisType === "category" ? "default" : "secondary"} className="ml-2">
                    {analysisType === "category" ? `카테고리 분석 (${foundCategory})` : "키워드 트렌드 분석"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 트렌드 라인 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                "{keyword}" {analysisType === "category" ? "분야의 클릭량" : "검색량"} 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insightData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`${value}`, analysisType === "category" ? '클릭량 추이' : '검색량 추이']}
                      labelFormatter={(label) => `기간: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ratio" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 기기별/성별/연령별 비율 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PC, 모바일 비율 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">기기별 비율 (기간함계)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 여성, 남성 비율 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">성별 비율 (기간함계)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 연령별 비율 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">연령별 비율 (기간함계)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="age" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `${value}%`} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 분석 요약 */}
          <Card>
            <CardHeader>
              <CardTitle>분석 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {insightData.length}개월
                  </div>
                  <div className="text-sm text-gray-600">분석 기간</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {insightData && insightData.length > 0 
                      ? Math.max(...insightData.map(d => d.ratio)).toFixed(1)
                      : '0'}
                  </div>
                  <div className="text-sm text-gray-600">최고 {analysisType === "category" ? "클릭량" : "검색량"}</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {insightData && insightData.length > 0
                      ? Math.min(...insightData.map(d => d.ratio)).toFixed(1)
                      : '0'}
                  </div>
                  <div className="text-sm text-gray-600">최저 {analysisType === "category" ? "클릭량" : "검색량"}</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {insightData && insightData.length > 0
                      ? (insightData.reduce((sum, d) => sum + d.ratio, 0) / insightData.length).toFixed(1)
                      : '0'}
                  </div>
                  <div className="text-sm text-gray-600">평균 {analysisType === "category" ? "클릭량" : "검색량"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">키워드 분석 및 인사이트 분석 중입니다...</p>
        </div>
      )}
    </div>
  );
};

export default ShoppingInsight;
