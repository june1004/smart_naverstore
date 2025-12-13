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

  // 실제 카테고리 데이터 조회 (모든 데이터를 가져오기 위해 배치 페칭)
  // CategoryList와 동일한 쿼리 키를 사용하여 캐시 공유
  const { data: categoryData, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['naver-categories-paginated', '', null, 1, 20, 'category_id', 'asc'],
    queryFn: async () => {
      console.log('[PopularKeywords] 카테고리 데이터 조회 시작...', { user: !!user });
      
      // 모든 row를 1000개씩 반복적으로 fetch해서 합치는 함수
      // CategoryList와 동일한 방식으로 구현
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
          
          console.log(`[PopularKeywords] 배치 ${from}-${from + batchSize - 1}: ${data?.length || 0}개 로드`);
          
          // CategoryList와 동일한 로직
          if (!data || data.length === 0) {
            keepGoing = false;
          } else {
            allRows.push(...data);
            
            // 마지막 배치인 경우 종료
            if (data.length < batchSize) {
              keepGoing = false;
            } else {
              from += batchSize;
            }
          }
        }
        
        console.log('[PopularKeywords] fetchAllCategories 완료, 총 개수:', allRows.length);
        return allRows;
      }
      
      try {
        const data = await fetchAllCategories();
        console.log('[PopularKeywords] 로드된 전체 카테고리 수:', data.length);
        
        if (data.length === 0) {
          // 데이터가 없을 경우 is_active 필터 없이 다시 시도
          console.warn('[PopularKeywords] is_active=true인 데이터가 없습니다. 전체 데이터 조회 시도...');
          const { data: allData, error: allError } = await supabase
            .from('naver_categories')
            .select('*')
            .limit(100);
          
          if (allError) {
            console.error('[PopularKeywords] 전체 데이터 조회 오류:', allError);
          } else {
            console.log('[PopularKeywords] 전체 데이터 샘플 (100개):', allData?.length || 0);
            if (allData && allData.length > 0) {
              console.log('[PopularKeywords] 샘플 데이터 (첫 번째):', allData[0]);
              console.log('[PopularKeywords] is_active 값 분포:', {
                true: allData.filter(d => d.is_active === true).length,
                false: allData.filter(d => d.is_active === false).length,
                null: allData.filter(d => d.is_active === null || d.is_active === undefined).length
              });
              console.log('[PopularKeywords] category_level 분포:', {
                level1: allData.filter(d => d.category_level === 1).length,
                level2: allData.filter(d => d.category_level === 2).length,
                level3: allData.filter(d => d.category_level === 3).length,
                level4: allData.filter(d => d.category_level === 4).length,
              });
              
              // is_active가 false이거나 null인 경우, 그것들을 반환
              const inactiveData = allData.filter(d => d.is_active !== true);
              if (inactiveData.length > 0) {
                console.warn('[PopularKeywords] is_active가 true가 아닌 데이터가 있습니다. 이 데이터를 사용합니다.');
                return inactiveData; // 임시로 비활성 데이터라도 반환
              }
            } else {
              console.error('[PopularKeywords] 데이터베이스에 카테고리 데이터가 전혀 없습니다!');
            }
          }
        }
        
        // 대분류만 필터링
        const level1Categories = data.filter(cat => cat.category_level === 1);
        console.log('[PopularKeywords] 대분류 카테고리 수:', level1Categories.length);
        if (level1Categories.length > 0) {
          console.log('[PopularKeywords] 대분류 카테고리 목록:', level1Categories.map(c => c.category_name));
        } else if (data.length > 0) {
          console.log('[PopularKeywords] 전체 카테고리 레벨 분포:', {
            level1: data.filter(c => c.category_level === 1).length,
            level2: data.filter(c => c.category_level === 2).length,
            level3: data.filter(c => c.category_level === 3).length,
            level4: data.filter(c => c.category_level === 4).length,
            other: data.filter(c => !c.category_level || c.category_level > 4).length
          });
        }
        
        return data;
      } catch (error) {
        console.error('[PopularKeywords] 카테고리 조회 중 오류 발생:', error);
        throw error;
      }
    },
    // enabled 조건 제거 - 항상 실행되도록 함
    retry: 2, // 실패 시 2번 재시도
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
  
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
