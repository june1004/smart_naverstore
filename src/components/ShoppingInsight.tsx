
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [insightData, setInsightData] = useState<InsightData[]>([]);
  const [categoryAnalysis, setCategoryAnalysis] = useState<CategoryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchingCategory, setSearchingCategory] = useState(false);
  const { toast } = useToast();

  const categories = [
    { value: "50000000", label: "패션의류" },
    { value: "50000001", label: "패션잡화" },
    { value: "50000002", label: "화장품/미용" },
    { value: "50000003", label: "디지털/가전" },
    { value: "50000004", label: "가구/인테리어" },
    { value: "50000005", label: "출산/육아" },
    { value: "50000006", label: "식품" },
    { value: "50000007", label: "스포츠/레저" }
  ];

  const findCategoryByKeyword = async () => {
    if (!keyword.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "분석할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setSearchingCategory(true);

    try {
      const { data, error } = await supabase.functions.invoke('auto-category-finder', {
        body: { keyword: keyword.trim() }
      });

      if (error) throw new Error(error.message);

      setCategory(data.suggestedCategory);
      setCategoryAnalysis(data.categoryAnalysis);
      
      toast({
        title: "카테고리 자동 선택 완료",
        description: `"${keyword}" 키워드에 가장 적합한 카테고리를 찾았습니다.`,
      });

    } catch (error) {
      console.error('카테고리 찾기 오류:', error);
      toast({
        title: "카테고리 찾기 실패",
        description: "카테고리를 찾는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setSearchingCategory(false);
    }
  };

  const getInsight = async () => {
    if (!category) {
      toast({
        title: "카테고리를 선택해주세요",
        description: "먼저 키워드로 카테고리를 찾거나 직접 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "날짜를 선택해주세요",
        description: "분석 기간을 설정해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('naver-shopping-insight', {
        body: {
          category,
          startDate,
          endDate,
          timeUnit: 'month',
          device: '',
          ages: [],
          gender: ''
        }
      });

      if (error) throw new Error(error.message);

      setInsightData(data.results?.[0]?.data || []);
      toast({
        title: "인사이트 분석 완료",
        description: "쇼핑 인사이트 데이터를 성공적으로 가져왔습니다.",
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
      {/* 키워드 기반 카테고리 찾기 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            키워드 기반 카테고리 자동 선택
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="분석할 키워드를 입력하세요 (예: 기타청소용품)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && findCategoryByKeyword()}
              className="flex-1"
            />
            <Button 
              onClick={findCategoryByKeyword}
              disabled={searchingCategory}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {searchingCategory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              카테고리 찾기
            </Button>
          </div>
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

      {/* 분석 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            쇼핑인사이트 분석 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 카테고리 선택 */}
          <div>
            <label className="text-sm font-medium mb-2 block">카테고리</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="분석할 카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 날짜 범위 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">시작일 (YYYY-MM)</label>
              <input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">종료일 (YYYY-MM)</label>
              <input
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <Button 
            onClick={getInsight} 
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? "분석중..." : "인사이트 분석"}
          </Button>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {insightData.length > 0 && (
        <div className="space-y-6">
          {/* 트렌드 라인 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {keyword ? `"${keyword}"` : "카테고리"} 클릭량 추이
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
                <CardTitle className="text-lg">PC, 모바일</CardTitle>
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
                <CardTitle className="text-lg">여성, 남성</CardTitle>
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
                <CardTitle className="text-lg">연령별</CardTitle>
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
          <p className="mt-4 text-gray-600">인사이트 분석 중입니다...</p>
        </div>
      )}
    </div>
  );
};

export default ShoppingInsight;
