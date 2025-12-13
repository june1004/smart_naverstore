import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Search, TrendingUp, User, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface PopularKeyword {
  keyword: string;
  rank: number;
  ratio: number;
}

type PeriodOption = '1week' | '1month' | '3months' | '6months' | '1year' | 'custom';

const PopularKeywords = () => {
  const [popularKeywords, setPopularKeywords] = useState<PopularKeyword[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodOption>('1week');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // CategoryList와 동일한 쿼리 키를 사용하여 캐시 공유
  // CategoryList의 기본 쿼리 파라미터와 일치시킴
  const { data: categoryDataRaw, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['naver-categories-paginated', '', null, 1, 20, 'category_id', 'asc'],
    queryFn: async () => {
      console.log('[PopularKeywords] CategoryList 쿼리 재사용 시도...');
      
      // CategoryList와 완전히 동일한 쿼리 로직
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
            .range(from, from + batchSize - 1);

          // CategoryList와 동일: selectedLevel이 null이 아니면 정렬 추가
          // 여기서는 항상 정렬 추가 (CategoryList의 기본 동작과 유사)
          query = query.order('category_id', { ascending: true });

          const { data, error } = await query;
          
          if (error) {
            console.error('[PopularKeywords] 카테고리 데이터 조회 오류:', error);
            throw error;
          }
          
          console.log(`[PopularKeywords] 배치 ${from}-${from + batchSize - 1}: ${data?.length || 0}개 로드`);
          
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
        
        console.log('[PopularKeywords] fetchAllCategories 완료, 총 개수:', allRows.length);
        return allRows;
      }
      
      const data = await fetchAllCategories();
      console.log('[PopularKeywords] 로드된 전체 카테고리 수:', data.length);
      
      // 대분류 카테고리 확인
      const level1Categories = data.filter(cat => cat.category_level === 1);
      console.log('[PopularKeywords] 대분류 카테고리 수:', level1Categories.length);
      
      return data;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
  
  // CategoryList와 동일하게 category_path 파싱하여 대분류 추출
  const categoryData = useMemo(() => {
    if (!categoryDataRaw || categoryDataRaw.length === 0) {
      return [];
    }

    // CategoryList의 parseCategoryPath와 동일한 로직
    const parseCategoryPath = (category: any) => {
      const pathParts = category.category_path ? category.category_path.split(' > ').filter((part: string) => part.trim() !== '') : [];
      return {
        ...category,
        large_category: pathParts[0] || '',
        medium_category: pathParts[1] || '',
        small_category: pathParts[2] || '',
        smallest_category: pathParts[3] || '',
      };
    };

    const parsedCategories = categoryDataRaw.map(parseCategoryPath);
    
    // 대분류만 추출 (CategoryList와 동일한 방식)
    const uniqueLargeCategories = Array.from(
      new Set(parsedCategories.map(c => c.large_category))
    ).filter(Boolean);
    
    // 각 대분류의 첫 번째 카테고리만 선택
    const level1Categories = uniqueLargeCategories.map(lc => 
      parsedCategories.find(c => c.large_category === lc)
    ).filter(Boolean);
    
    console.log('[PopularKeywords] 파싱된 대분류 카테고리:', {
      total: categoryDataRaw.length,
      uniqueLargeCategories: uniqueLargeCategories.length,
      level1Categories: level1Categories.length,
      largeCategories: uniqueLargeCategories
    });
    
    return level1Categories;
  }, [categoryDataRaw]);
  
  // 디버깅: 쿼리 상태 로깅
  useEffect(() => {
    console.log('[PopularKeywords] 쿼리 상태:', {
      isLoading: categoriesLoading,
      hasData: !!categoryDataRaw,
      rawDataLength: categoryDataRaw?.length || 0,
      parsedDataLength: categoryData?.length || 0,
      error: categoriesError,
      user: !!user
    });
  }, [categoriesLoading, categoryDataRaw, categoryData, categoriesError, user]);

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

    // 날짜가 비어있으면 현재 선택된 기간으로 계산
    const periodDates = calculatePeriodDates(period);
    const finalStartDate = startDate || periodDates.start;
    const finalEndDate = endDate || periodDates.end;

    if (!finalStartDate || !finalEndDate) {
      toast({
        title: "날짜를 선택해주세요",
        description: "시작일과 종료일을 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPopularKeywords([]);

    try {
      console.log('인기검색어 조회 요청:', { 
        category: selectedCategory, 
        startDate: finalStartDate, 
        endDate: finalEndDate 
      });

      const { data, error } = await supabase.functions.invoke('naver-popular-keywords', {
        body: { 
          category: selectedCategory,
          startDate: finalStartDate,
          endDate: finalEndDate,
          timeUnit: 'date'
        }
      });

      if (error) {
        console.error('Edge Function 오류 상세:', error);
        let errorMessage = error.message;
        if (error.status === 400) {
          errorMessage = `요청 오류: ${error.details || error.message}. 날짜 형식을 확인해주세요.`;
        } else if (error.status === 500) {
          errorMessage = `서버 오류: ${error.details || error.message}`;
        }
        throw new Error(errorMessage);
      }

      if (!data || !data.keywords) {
        throw new Error('응답 데이터가 올바르지 않습니다.');
      }

      setPopularKeywords(data.keywords);

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

  // 기간별 날짜 계산 함수
  const calculatePeriodDates = (periodOption: PeriodOption): { start: string; end: string } => {
    const today = new Date();
    const end = formatDate(today);
    let start = new Date();

    switch (periodOption) {
      case '1week':
        start.setDate(today.getDate() - 7);
        break;
      case '1month':
        start.setMonth(today.getMonth() - 1);
        break;
      case '3months':
        start.setMonth(today.getMonth() - 3);
        break;
      case '6months':
        start.setMonth(today.getMonth() - 6);
        break;
      case '1year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'custom':
        // 사용자 지정은 현재 날짜 값 유지
        return { start: startDate || formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), end: endDate || formatDate(today) };
      default:
        start.setDate(today.getDate() - 7);
    }

    return { start: formatDate(start), end };
  };

  // 기간 변경 시 날짜 자동 업데이트
  useEffect(() => {
    if (period !== 'custom') {
      const { start, end } = calculatePeriodDates(period);
      setStartDate(start);
      setEndDate(end);
      setIsCustomDateOpen(false);
    } else {
      setIsCustomDateOpen(true);
    }
  }, [period]);

  // 초기 날짜 설정 (일주일)
  useEffect(() => {
    if (!startDate && !endDate) {
      const { start, end } = calculatePeriodDates('1week');
      setStartDate(start);
      setEndDate(end);
    }
  }, []);

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
                    // 이미 파싱된 대분류 카테고리를 가나다 순으로 정렬
                    const sortedCategories = [...categoryData].sort((a, b) => {
                      const nameA = a.large_category || a.category_name || '';
                      const nameB = b.large_category || b.category_name || '';
                      return nameA.localeCompare(nameB, 'ko');
                    });
                    
                    console.log('[PopularKeywords] SelectContent 렌더링 - 대분류 카테고리:', sortedCategories.length);
                    
                    return sortedCategories.map((category) => {
                      const displayName = category.large_category || category.category_name;
                      return (
                        <SelectItem key={category.category_id} value={category.category_id}>
                          {displayName}
                        </SelectItem>
                      );
                    });
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
            <Select 
              value={period} 
              onValueChange={(value) => setPeriod(value as PeriodOption)}
              disabled={!user}
            >
              <SelectTrigger>
                <SelectValue placeholder="기간 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1week">최근 1주일</SelectItem>
                <SelectItem value="1month">최근 1개월</SelectItem>
                <SelectItem value="3months">최근 3개월</SelectItem>
                <SelectItem value="6months">최근 6개월</SelectItem>
                <SelectItem value="1year">최근 1년</SelectItem>
                <SelectItem value="custom">사용자 지정</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={searchPopularKeywords} 
              disabled={loading || !user || !selectedCategory}
              className="bg-green-600 hover:bg-green-700"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? "검색중..." : "검색"}
            </Button>
          </div>
          
          {/* 사용자 지정 날짜 입력 (Collapsible) */}
          <Collapsible open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between text-sm text-gray-600 hover:text-gray-900"
                disabled={!user || period !== 'custom'}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {period === 'custom' ? '날짜 직접 입력' : '날짜 직접 입력 (사용자 지정 선택 시 활성화)'}
                </span>
                {isCustomDateOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">시작일</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={!user || period !== 'custom'}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">종료일</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={!user || period !== 'custom'}
                    className="w-full"
                  />
                </div>
              </div>
              {period === 'custom' && (
                <p className="text-xs text-gray-500">
                  선택된 기간: {startDate} ~ {endDate}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
          
          {/* 현재 선택된 기간 표시 */}
          {period !== 'custom' && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <Calendar className="h-4 w-4 inline mr-2" />
              기간: {startDate} ~ {endDate}
            </div>
          )}
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
