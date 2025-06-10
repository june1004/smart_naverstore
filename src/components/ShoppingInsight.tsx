
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { BarChart3, TrendingUp, Search, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface InsightData {
  period: string;
  ratio: number;
}

interface CategoryAnalysis {
  mainCategory: [string, number] | null;
  allCategories: [string, number][];
}

const ShoppingInsight = () => {
  const [keyword, setKeyword] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"1month" | "3months" | "1year">("1month");
  const [insightData, setInsightData] = useState<InsightData[]>([]);
  const [categoryAnalysis, setCategoryAnalysis] = useState<CategoryAnalysis | null>(null);
  const [foundCategory, setFoundCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
      startDate: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
      endDate: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
    };
  };

  const analyzeKeywordInsight = async () => {
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

      setFoundCategory(categoryData.suggestedCategory);
      setCategoryAnalysis(categoryData.categoryAnalysis);

      // 2단계: 찾은 카테고리로 인사이트 분석
      const selectedPeriodOption = periodOptions.find(p => p.value === selectedPeriod);
      const { startDate, endDate } = getDateRange(selectedPeriodOption?.months || 1);

      const { data: insightData, error: insightError } = await supabase.functions.invoke('naver-shopping-insight', {
        body: {
          category: categoryData.suggestedCategory,
          startDate,
          endDate,
          timeUnit: 'month',
          device: '',
          ages: [],
          gender: ''
        }
      });

      if (insightError) throw new Error(insightError.message);

      setInsightData(insightData.results?.[0]?.data || []);
      
      toast({
        title: "인사이트 분석 완료",
        description: `"${keyword}" 키워드의 ${selectedPeriodOption?.label} 인사이트 분석이 완료되었습니다.`,
      });

    } catch (error) {
      console.error('인사이트 분석 오류:', error);
      toast({
        title: "분석 실패",
        description: "인사이트 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-6">
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
            <CardTitle>카테고리 분석 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="category-analysis">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    상세 카테고리 분석 보기
                    {categoryAnalysis.mainCategory && (
                      <span className="text-sm text-muted-foreground">
                        (주요: {categoryAnalysis.mainCategory[0]})
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {categoryAnalysis.allCategories.map(([cat, count], index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">{cat}</span>
                        <span className="text-sm font-medium">{count}개 상품</span>
                      </div>
                    ))}
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
                {categoryAnalysis?.mainCategory && (
                  <div className="col-span-2">
                    <span className="font-medium">발견된 카테고리:</span> {categoryAnalysis.mainCategory[0]}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 트렌드 라인 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                "{keyword}" 분야의 클릭량 추이
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
                      formatter={(value: any) => [`${value}`, '클릭량 추이']}
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
                    {Math.max(...insightData.map(d => d.ratio)).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">최고 클릭량</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.min(...insightData.map(d => d.ratio)).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">최저 클릭량</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {(insightData.reduce((sum, d) => sum + d.ratio, 0) / insightData.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">평균 클릭량</div>
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
