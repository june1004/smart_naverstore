import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, TrendingUp, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface PopularKeyword {
  keyword: string;
  rank: number;
  ratio: number;
}

const PopularKeywords = () => {
  const [popularKeywords, setPopularKeywords] = useState<PopularKeyword[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // CategoryList와 동일한 쿼리 키를 사용하여 캐시 공유
  // CategoryList에서 이미 데이터를 가져오고 있다면 재사용
  const { data: categoryDataRaw, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['naver-categories-paginated', '', null, 1, 20, 'category_id', 'asc'],
    queryFn: async () => {
      console.log('[PopularKeywords] CategoryList 쿼리 재사용 시도...');
      
      // CategoryList와 완전히 동일한 쿼리
      async function fetchAllCategories() {
        const allRows = [];
        let from = 0;
        const batchSize = 1000;
        let keepGoing = true;
        
        while (keepGoing) {
          let query = supabase
            .from('naver_categories')
            .select('*', { count: 'exact' })
            .eq('is_active', true)
            .order('category_id', { ascending: true })
            .range(from, from + batchSize - 1);

          const { data, error } = await query;
          
          if (error) {
            console.error('[PopularKeywords] 카테고리 데이터 조회 오류:', error);
            throw error;
          }
          
          if (!data || data.length === 0) {
            keepGoing = false;
          } else {
            allRows.push(...data);
            
            if (data.length < batchSize) {
              keepGoing = false;
            } else {
              from += batchSize;
            }
          }
        }
        
        return allRows;
      }
      
      const data = await fetchAllCategories();
      console.log('[PopularKeywords] 로드된 전체 카테고리 수:', data.length);
      return data;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
  
  // CategoryList와 동일하게 파싱 (필요시)
  const categoryData = categoryDataRaw;
  
  // 디버깅: 쿼리 상태 로깅
  useEffect(() => {
    console.log('[PopularKeywords] 쿼리 상태:', {
      isLoading: categoriesLoading,
      hasData: !!categoryData,
      dataLength: categoryData?.length || 0,
      error: categoriesError,
      user: !!user
    });
  }, [categoriesLoading, categoryData, categoriesError, user]);

  // 선택된 카테고리 정보 로드
  useEffect(() => {
    const storedCategory = localStorage.getItem('selectedCategory');
    if (storedCategory) {
      const categoryInfo = JSON.parse(storedCategory);
      setSelectedCategory(categoryInfo.categoryId);
      setSelectedCategoryInfo(categoryInfo);
      
      // 현재 날짜와 일주일 전 날짜 설정
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      setEndDate(formatDate(today));
      setStartDate(formatDate(lastWeek));
      
      toast({
        title: "카테고리 자동 선택",
        description: `${categoryInfo.categoryName} 카테고리가 자동으로 선택되었습니다.`,
      });
      
      // 로컬스토리지에서 제거 (한 번만 사용)
      localStorage.removeItem('selectedCategory');
    }
  }, [toast]);

  // 인증되지 않은 사용자 체크
  useEffect(() => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "분야별 인기검색어 기능을 사용하려면 로그인해주세요.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const searchPopularKeywords = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "회원가입 또는 로그인 후 이용해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCategory) {
      toast({
        title: "카테고리를 선택해주세요",
        description: "분석할 카테고리를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('naver-popular-keywords', {
        body: { 
          category: selectedCategory,
          startDate,
          endDate,
          timeUnit: 'date'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setPopularKeywords(data.keywords || data);

      toast({
        title: "검색 완료",
        description: `카테고리별 인기검색어를 조회했습니다.`,
      });

    } catch (error) {
      console.error('인기검색어 조회 오류:', error);
      toast({
        title: "검색 실패",
        description: "인기검색어 조회 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = formatDate(new Date());
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekFormatted = formatDate(lastWeek);

  return (
    <div className="space-y-6">
      {/* 선택된 카테고리 정보 표시 */}
      {selectedCategoryInfo && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <Search className="h-4 w-4" />
              <span className="font-medium">선택된 카테고리</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              {selectedCategoryInfo.categoryName} (ID: {selectedCategoryInfo.categoryId})
            </p>
            {selectedCategoryInfo.categoryPath && (
              <p className="text-xs text-green-500 mt-1">
                경로: {selectedCategoryInfo.categoryPath}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 검색 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            분야별 인기검색어
          </CardTitle>
          <CardDescription>
            특정 분야의 인기검색어를 조회합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select 
              value={selectedCategory} 
              onValueChange={setSelectedCategory} 
              disabled={!user || categoriesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !user 
                    ? "로그인 필요" 
                    : categoriesLoading 
                    ? "카테고리 로딩 중..." 
                    : "카테고리 선택"
                } />
              </SelectTrigger>
              <SelectContent>
                {categoriesLoading ? (
                  <div className="p-2 text-sm text-gray-500">카테고리 로딩 중...</div>
                ) : categoriesError ? (
                  <div className="p-2 text-sm text-red-500">
                    카테고리 로드 실패: {categoriesError instanceof Error ? categoriesError.message : '알 수 없는 오류'}
                    <br />
                    <span className="text-xs">콘솔을 확인해주세요.</span>
                  </div>
                ) : categoryData && categoryData.length > 0 ? (
                  (() => {
                    const level1Categories = categoryData
                      .filter(cat => cat.category_level === 1)
                      .sort((a, b) => a.category_name.localeCompare(b.category_name, 'ko'));
                    
                    console.log('[PopularKeywords] SelectContent 렌더링 - 대분류 카테고리:', level1Categories.length);
                    
                    if (level1Categories.length === 0) {
                      return (
                        <div className="p-2 text-sm text-gray-500">
                          대분류 카테고리가 없습니다
                          <br />
                          <span className="text-xs">전체 카테고리: {categoryData.length}개</span>
                        </div>
                      );
                    }
                    
                    return level1Categories.map((category) => (
                      <SelectItem key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </SelectItem>
                    ));
                  })()
                ) : (
                  <div className="p-2 text-sm text-gray-500">
                    카테고리가 없습니다
                    <br />
                    <span className="text-xs">데이터베이스에 카테고리 데이터가 없거나 로드되지 않았습니다.</span>
                  </div>
                )}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder={lastWeekFormatted}
              disabled={!user}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder={today}
              disabled={!user}
            />
            <Button 
              onClick={searchPopularKeywords} 
              disabled={loading || !user}
              className="bg-green-600 hover:bg-green-700"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? "검색중..." : "검색"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 검색 결과 */}
      {popularKeywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              인기검색어 목록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>순위</TableHead>
                  <TableHead>키워드</TableHead>
                  <TableHead>검색비율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popularKeywords.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="outline">{item.rank}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.keyword}</TableCell>
                    <TableCell>{item.ratio}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">인기검색어를 조회하고 있습니다...</p>
        </div>
      )}
    </div>
  );
};

export default PopularKeywords;
