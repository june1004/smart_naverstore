
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Search, Sparkles, TrendingUp, ShoppingBag, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CategoryInfo {
  name: string;
  code: string;
  level1: string;
  level2: string;
  level3: string;
  count: number;
  percentage: string;
}

interface InsightData {
  category: CategoryInfo;
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
}

interface AnalysisResult {
  keyword: string;
  categoryAnalysis: {
    totalItems: number;
    recommendedCategories: CategoryInfo[];
    allCategories: CategoryInfo[];
  };
  insights: InsightData[];
}

const AutoKeywordAnalyzer = () => {
  const [keyword, setKeyword] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const analyzeKeyword = async () => {
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
      const { data, error } = await supabase.functions.invoke('auto-category-finder', {
        body: { keyword: keyword.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      setAnalysisResult(data);

      // 분석 결과 저장 - 익명 사용자를 위한 임시 ID 생성
      const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error: saveError } = await supabase
        .from('keyword_analysis')
        .insert({
          keyword: keyword.trim(),
          analysis_data: data,
          user_id: tempUserId
        });

      if (saveError) {
        console.error('분석 결과 저장 실패:', saveError);
      }

      toast({
        title: "분석 완료",
        description: `'${keyword}' 키워드 분석이 완료되었습니다.`,
      });

    } catch (error) {
      console.error('키워드 분석 오류:', error);
      toast({
        title: "분석 실패",
        description: "키워드 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <div className="space-y-6">
      {/* 키워드 입력 및 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI 키워드 자동 분석
          </CardTitle>
          <p className="text-sm text-gray-600">
            키워드를 입력하면 자동으로 카테고리를 찾아 트렌드와 인사이트를 분석해드립니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="분석할 키워드를 입력하세요 (예: 아이폰, 김치, 운동화 등)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && analyzeKeyword()}
              className="flex-1"
            />
            <Button 
              onClick={analyzeKeyword} 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? "분석중..." : "AI 분석"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {analysisResult && (
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              카테고리 분석
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
            <Card>
              <CardHeader>
                <CardTitle>'{analysisResult.keyword}' 카테고리 분석 결과</CardTitle>
                <p className="text-sm text-gray-600">
                  총 {analysisResult.categoryAnalysis?.totalItems || 0}개 상품 분석
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>순위</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>상품 수</TableHead>
                      <TableHead>비율</TableHead>
                      <TableHead>카테고리 코드</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(analysisResult.categoryAnalysis?.recommendedCategories || []).map((category, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{category.level1}</div>
                            {category.level2 && (
                              <div className="text-sm text-gray-500">└ {category.level2}</div>
                            )}
                            {category.level3 && (
                              <div className="text-sm text-gray-400">　└ {category.level3}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{category.count}개</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{category.percentage}%</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{category.code}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {(analysisResult.insights || []).map((insight, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {insight.category?.level1 || '키워드'} 인사이트
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    카테고리 코드: {insight.category?.code || 'N/A'} | 비율: {insight.category?.percentage || 'N/A'}%
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={insight.insight?.results?.[0]?.data || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => [`${value}`, '검색 비율']}
                          labelFormatter={(label) => `기간: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="ratio" 
                          stroke={colors[index % colors.length]} 
                          strokeWidth={3}
                          dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>카테고리별 상품 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(analysisResult.categoryAnalysis?.recommendedCategories || []).slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="level1" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`${value}개`, '상품 수']}
                      />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>상세 분석 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {analysisResult.categoryAnalysis?.totalItems || 0}
                    </div>
                    <div className="text-sm text-gray-600">총 분석 상품</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {(analysisResult.categoryAnalysis?.recommendedCategories || []).length}
                    </div>
                    <div className="text-sm text-gray-600">발견된 카테고리</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {(analysisResult.insights || []).length}
                    </div>
                    <div className="text-sm text-gray-600">인사이트 차트</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {analysisResult.categoryAnalysis?.recommendedCategories?.[0]?.percentage || 0}%
                    </div>
                    <div className="text-sm text-gray-600">주요 카테고리 비율</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">AI가 키워드를 분석하고 있습니다...</p>
          <p className="text-sm text-gray-500">카테고리 추천 및 인사이트 수집 중</p>
        </div>
      )}
    </div>
  );
};

export default AutoKeywordAnalyzer;
