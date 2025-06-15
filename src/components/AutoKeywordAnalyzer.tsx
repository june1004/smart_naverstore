
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Search, Sparkles, TrendingUp, ShoppingBag, BarChart3, Target, Calendar, Users, ExternalLink, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKeyword } from "@/contexts/KeywordContext";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface CategoryInfo {
  name: string;
  code: string;
  level1: string;
  level2: string;
  level3: string;
  count: number;
  percentage: string;
}

interface AnalysisResult {
  keyword: string;
  categoryAnalysis: {
    totalItems: number;
    recommendedCategories: CategoryInfo[];
  };
  insights: Array<{
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
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { setSharedKeyword } = useKeyword();
  const { analysisResult, setAnalysisResult, isAnalysisValid } = useAnalysis();
  const { user } = useAuth();

  // 실제 카테고리 데이터 조회
  const { data: categoryData } = useQuery({
    queryKey: ['naver-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('naver_categories')
        .select('*')
        .order('category_level', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

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

      // 실제 카테고리 구조와 매핑
      const enhancedData = enhanceWithRealCategories(data, categoryData);
      setAnalysisResult(enhancedData);
      
      // 분석된 키워드를 전역 상태에 저장
      setSharedKeyword(keyword.trim());

      toast({
        title: "분석 완료",
        description: `'${keyword}' 키워드 AI 자동 분석이 완료되었습니다.`,
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

  const enhanceWithRealCategories = (data: any, categories: any[]) => {
    if (!categories || !data.categoryAnalysis?.recommendedCategories) return data;

    const enhancedCategories = data.categoryAnalysis.recommendedCategories.map((category: any) => {
      // 카테고리 매칭 로직 개선
      let matchedCategory = null;
      
      // 1. 카테고리 ID로 직접 매칭
      if (category.code && category.code !== 'N/A') {
        matchedCategory = categories.find(cat => cat.category_id === category.code);
      }
      
      // 2. 카테고리명으로 매칭 (정확한 매칭)
      if (!matchedCategory && category.name) {
        const categoryName = category.name.replace(/>/g, ' > ').trim();
        matchedCategory = categories.find(cat => 
          cat.category_path === categoryName ||
          cat.category_name === categoryName
        );
      }
      
      // 3. 부분 매칭 (레벨별로)
      if (!matchedCategory) {
        // 대분류만으로 매칭
        if (category.level1) {
          matchedCategory = categories.find(cat => {
            if (!cat.category_path) return false;
            const pathParts = cat.category_path.split(' > ');
            return pathParts[0] === category.level1 && pathParts.length === 1;
          });
        }
        
        // 중분류까지 매칭
        if (!matchedCategory && category.level1 && category.level2) {
          matchedCategory = categories.find(cat => {
            if (!cat.category_path) return false;
            const pathParts = cat.category_path.split(' > ');
            return pathParts[0] === category.level1 && 
                   pathParts[1] === category.level2 && 
                   pathParts.length === 2;
          });
        }
        
        // 소분류까지 매칭
        if (!matchedCategory && category.level1 && category.level2 && category.level3) {
          matchedCategory = categories.find(cat => {
            if (!cat.category_path) return false;
            const pathParts = cat.category_path.split(' > ');
            return pathParts[0] === category.level1 && 
                   pathParts[1] === category.level2 && 
                   pathParts[2] === category.level3 && 
                   pathParts.length === 3;
          });
        }
      }

      if (matchedCategory) {
        const pathParts = matchedCategory.category_path ? matchedCategory.category_path.split(' > ') : [];
        return {
          ...category,
          realCategoryPath: matchedCategory.category_path,
          realCategoryId: matchedCategory.category_id,
          realCategoryLevel: matchedCategory.category_level,
          level1: pathParts[0] || category.level1,
          level2: pathParts[1] || category.level2,
          level3: pathParts[2] || category.level3,
          hasRealCategory: true
        };
      }

      return {
        ...category,
        hasRealCategory: false
      };
    });

    return {
      ...data,
      categoryAnalysis: {
        ...data.categoryAnalysis,
        recommendedCategories: enhancedCategories
      }
    };
  };

  const handleCategoryClick = (category: any) => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "카테고리 상세 분석을 위해서는 로그인이 필요합니다. 로그인 후 통합검색어 트렌드 페이지에서 해당 카테고리의 인기검색어를 확인하실 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    if (category.hasRealCategory && category.realCategoryId) {
      // 카테고리 클릭 시 통합검색어 트렌드로 이동하면서 카테고리 정보 전달
      const categoryInfo = {
        categoryId: category.realCategoryId,
        categoryName: category.level1,
        categoryPath: category.realCategoryPath
      };
      
      // 로컬스토리지에 선택된 카테고리 정보 저장
      localStorage.setItem('selectedCategory', JSON.stringify(categoryInfo));
      
      toast({
        title: "카테고리 선택됨",
        description: `${category.level1} 카테고리가 선택되었습니다. 통합검색어 트렌드 탭에서 확인하세요.`,
      });
    } else {
      toast({
        title: "카테고리 정보 없음",
        description: "해당 카테고리는 등록된 카테고리 목록에서 찾을 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  // 페이지 로드 시 유효한 분석 결과가 있으면 표시
  useEffect(() => {
    if (analysisResult && isAnalysisValid() && !keyword) {
      setKeyword(analysisResult.keyword);
    }
  }, [analysisResult, isAnalysisValid, keyword]);

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
            키워드를 입력하면 자동으로 카테고리, 검색량, 경쟁률, 트렌드 등을 종합 분석해드립니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="분석할 키워드를 입력하세요.(예:듀라코트, 아이폰 등 1개의 키워드)"
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
          {analysisResult && isAnalysisValid() && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              마지막 분석: {analysisResult.keyword} (분석 결과는 1시간 동안 유지됩니다)
            </div>
          )}
        </CardContent>
      </Card>

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
            <Card>
              <CardHeader>
                <CardTitle>'{analysisResult.keyword}' 카테고리 분석 결과</CardTitle>
                <p className="text-sm text-gray-600">
                  총 {analysisResult.categoryAnalysis?.totalItems || 0}개 상품 분석 (실제 카테고리 구조 연동)
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
                      <TableHead>상세 분석</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(analysisResult.categoryAnalysis?.recommendedCategories || []).map((category, index) => (
                      <TableRow 
                        key={index}
                        className={category.hasRealCategory ? "cursor-pointer hover:bg-blue-50" : ""}
                        onClick={() => handleCategoryClick(category)}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              {category.level1}
                              {category.hasRealCategory && user && (
                                <ExternalLink className="h-3 w-3 text-blue-500" />
                              )}
                              {!user && (
                                <Lock className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
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
                        <TableCell className="font-mono text-sm">
                          {category.hasRealCategory ? category.realCategoryId : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {category.hasRealCategory ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="bg-green-600">연동됨</Badge>
                              {!user && (
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  로그인 필요
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">미연동</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {!user && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm font-medium">상세 카테고리 분석</span>
                    </div>
                    <p className="text-sm text-orange-600 mt-1">
                      로그인하시면 카테고리를 클릭하여 통합검색어 트렌드 페이지에서 해당 카테고리의 인기검색어를 확인하실 수 있습니다.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 월별 검색량과 경쟁률 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  12개월 검색량 추이 및 경쟁률
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600">경쟁률</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {analysisResult.monthlySearchStats?.competitiveness || 'N/A'}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600">검색어 유효성</div>
                    <div className="text-2xl font-bold text-green-600">
                      {analysisResult.monthlySearchStats?.validity || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisResult.monthlySearchStats?.monthlyData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`${value}`, '검색량 지수']}
                        labelFormatter={(label) => `기간: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ratio" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {/* 가격대별 검색 비중 분석 */}
            <Card>
              <CardHeader>
                <CardTitle>가격대별 검색 비중 분석</CardTitle>
                <p className="text-sm text-gray-600">시장 가격대 추정을 위한 분석</p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisResult.priceAnalysis || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`${value}개`, '상품 수']}
                      />
                      <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 실시간 검색 클릭 추이 */}
            <Card>
              <CardHeader>
                <CardTitle>실시간 검색 클릭 추이 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisResult.clickTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`${value}`, '클릭 지수']}
                        labelFormatter={(label) => `기간: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ratio" 
                        stroke="#F59E0B" 
                        strokeWidth={3}
                        dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {/* 연령/성별/기기별 검색 패턴 분석 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 연령별 분석 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    연령별 검색 패턴
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysisResult.demographicAnalysis?.age || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => `${value}%`} />
                        <Bar dataKey="percentage" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 성별 분석 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">성별 검색 패턴</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analysisResult.demographicAnalysis?.gender || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="percentage"
                          label={({ type, percentage }) => `${type} ${percentage}%`}
                        >
                          {(analysisResult.demographicAnalysis?.gender || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `${value}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 기기별 분석 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">기기별 검색 패턴</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analysisResult.demographicAnalysis?.device || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="percentage"
                          label={({ type, percentage }) => `${type} ${percentage}%`}
                        >
                          {(analysisResult.demographicAnalysis?.device || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index + 2]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `${value}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 종합 분석 요약 */}
            <Card>
              <CardHeader>
                <CardTitle>종합 분석 요약</CardTitle>
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
                      {analysisResult.monthlySearchStats?.competitiveness || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">경쟁률</div>
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
          <p className="mt-4 text-gray-600">AI가 키워드를 종합 분석하고 있습니다...</p>
          <p className="text-sm text-gray-500">카테고리, 검색량, 경쟁률, 트렌드 분석 중</p>
        </div>
      )}
    </div>
  );
};

export default AutoKeywordAnalyzer;
