import { useState, useEffect, MutableRefObject } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CategoryListTable from "./CategoryListTable";
import CategoryPagination from "./CategoryPagination";

interface Category {
  id: string;
  category_id: string;
  category_name: string;
  parent_category_id?: string;
  category_level: number;
  category_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ParsedCategory {
  id: string;
  category_id: string;
  category_name: string;
  large_category: string;
  medium_category: string;
  small_category: string;
  smallest_category: string;
  category_level: number;
  category_path: string;
  is_active: boolean;
  created_at: string;
}

type SortField = 'category_id' | 'category_name' | 'category_hierarchy' | 'category_path' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface CategoryListProps {
  selectedLevel: number | null;
  onLevelFilter: (level: number | null) => void;
  refetchRef?: MutableRefObject<any>;
}

const CategoryList = ({ selectedLevel, onLevelFilter, refetchRef }: CategoryListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<SortField>('category_hierarchy');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedLargeCategory, setSelectedLargeCategory] = useState<string | null>(null);

  // 초기화면에서 대분류만 표시하도록 설정
  useEffect(() => {
    if (selectedLevel === null && !searchTerm) {
      onLevelFilter(1); // 초기화면에서는 대분류만 표시
    }
  }, []);

  // 카테고리 경로를 파싱하여 각 분류 레벨을 추출하는 함수
  const parseCategoryPath = (category: Category): ParsedCategory => {
    const pathParts = category.category_path ? category.category_path.split(' > ').filter(part => part.trim() !== '') : [];
    return {
      id: category.id,
      category_id: category.category_id,
      category_name: category.category_name,
      large_category: pathParts[0] || '',
      medium_category: pathParts[1] || '',
      small_category: pathParts[2] || '',
      smallest_category: pathParts[3] || '',
      category_level: category.category_level,
      category_path: category.category_path || '',
      is_active: category.is_active,
      created_at: category.created_at
    };
  };

  // 실제 레벨 계산 함수 (빈 문자열 제외)
  const getActualLevel = (category: ParsedCategory): number => {
    const pathParts = category.category_path.split(' > ').filter(part => part.trim() !== '');
    return pathParts.length;
  };

  // 계층구조 정렬을 위한 커스텀 정렬 함수
  const sortByHierarchy = (a: ParsedCategory, b: ParsedCategory, direction: SortDirection) => {
    // 대분류 먼저 비교
    const largeCompare = a.large_category.localeCompare(b.large_category, 'ko');
    if (largeCompare !== 0) {
      return direction === 'asc' ? largeCompare : -largeCompare;
    }
    
    // 중분류 비교
    const mediumCompare = a.medium_category.localeCompare(b.medium_category, 'ko');
    if (mediumCompare !== 0) {
      return direction === 'asc' ? mediumCompare : -mediumCompare;
    }
    
    // 소분류 비교
    return direction === 'asc' ? 
      a.small_category.localeCompare(b.small_category, 'ko') : 
      b.small_category.localeCompare(a.small_category, 'ko');
  };

  // 단일 키워드 검색을 위한 함수
  const buildSearchQuery = (searchTerm: string) => {
    if (!searchTerm) return '';
    
    const trimmedTerm = searchTerm.trim();
    
    // 단일 키워드로 모든 필드에서 검색
    return `category_name.ilike.%${trimmedTerm}%,category_id.ilike.%${trimmedTerm}%,category_path.ilike.%${trimmedTerm}%`;
  };

  // 카테고리 목록 조회
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError, refetch } = useQuery({
    queryKey: ['naver-categories-paginated', searchTerm, selectedLevel, currentPage, itemsPerPage, sortField, sortDirection],
    queryFn: async () => {
      let query = supabase
        .from('naver_categories')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      // 검색 조건 추가 (단일 키워드 검색 지원)
      if (searchTerm) {
        const searchQuery = buildSearchQuery(searchTerm);
        if (searchQuery) {
          query = query.or(searchQuery);
        }
      }

      // 전체 클릭 시 limit 없이 모두 조회
      // (selectedLevel === null 이면 전체)
      if (selectedLevel === null) {
        // limit 없이 전체 조회
        query = query.limit(10000); // 1만개까지 허용 (필요시 더 늘릴 수 있음)
      } else {
        // 기본 정렬 (계층구조 정렬을 제외한 나머지)
        if (sortField !== 'category_hierarchy') {
          query = query.order(sortField, { ascending: sortDirection === 'asc' });
        } else {
          query = query.order('category_id', { ascending: true });
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // 카테고리 데이터 파싱
      let parsedCategories = data ? data.map(parseCategoryPath) : [];
      // 전체 데이터 보관 (드릴다운용)
      const parsedCategoriesAll = parsedCategories;

      if (selectedLevel === 1) {
        // 대분류만: 대분류 11개만 표출
        const uniqueLargeCategories = Array.from(new Set(parsedCategories.map(c => c.large_category))).filter(Boolean);
        parsedCategories = uniqueLargeCategories.map(lc => parsedCategories.find(c => c.large_category === lc)).filter(Boolean) as ParsedCategory[];
      } else if (selectedLevel !== null) {
        // 중/소/세분류: 해당 레벨 전체 표출
        parsedCategories = parsedCategories.filter(category => {
          const actualLevel = getActualLevel(category);
          return actualLevel === selectedLevel;
        });
      }

      // 계층구조 정렬이 선택된 경우 클라이언트에서 정렬
      if (sortField === 'category_hierarchy') {
        parsedCategories.sort((a, b) => sortByHierarchy(a, b, sortDirection));
      }

      // 페이지네이션 적용 (단, 전체 클릭 시도 모두 적용)
      const totalCount = parsedCategories.length;
      const totalPages = Math.ceil(totalCount / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedCategories = parsedCategories.slice(startIndex, endIndex);

      return {
        categories: paginatedCategories,
        totalCount,
        totalPages,
        parsedCategoriesAll
      };
    },
  });

  useEffect(() => {
    if (refetchRef) refetchRef.current = refetch;
  }, [refetch, refetchRef]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    // 검색어가 있으면 필터 해제
    if (value && selectedLevel === 1) {
      onLevelFilter(null);
    }
  };

  const getLevelName = (level: number) => {
    switch (level) {
      case 1: return '대분류';
      case 2: return '중분류';
      case 3: return '소분류';
      default: return `${level}분류`;
    }
  };

  // 대분류 드릴다운: 대분류 클릭 시 하위 분류 전체 표출
  const handleLargeCategoryClick = (largeCategory: string) => {
    setSelectedLargeCategory(largeCategory === selectedLargeCategory ? null : largeCategory);
  };

  const parsedCategoriesAll = categoriesData?.parsedCategoriesAll || [];

  if (categoriesError) {
    console.error('카테고리 로딩 오류:', categoriesError);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          카테고리 목록
          {selectedLevel && (
            <Badge variant="outline" className="ml-2">
              <Filter className="h-3 w-3 mr-1" />
              {getLevelName(selectedLevel)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          등록된 네이버 카테고리 정보를 확인합니다. 로그인 시 카테고리 클릭으로 인기검색어를 확인할 수 있습니다.
          {categoriesData && ` (총 ${categoriesData.totalCount}개)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="카테고리명, ID, 분류명으로 검색... (예: 텐트, 50002649, 스포츠)"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1"
            />
            {selectedLevel && (
              <Button
                variant="outline"
                onClick={() => onLevelFilter(null)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                필터 해제
              </Button>
            )}
          </div>
          
          {categoriesLoading ? (
            <div className="text-center py-8">
              <p>로딩 중...</p>
            </div>
          ) : categoriesError ? (
            <div className="text-center py-8">
              <Alert variant="destructive">
                <AlertDescription>
                  카테고리 목록을 불러오는데 실패했습니다. 새로고침 후 다시 시도해주세요.
                </AlertDescription>
              </Alert>
            </div>
          ) : categoriesData && categoriesData.categories.length > 0 ? (
            <>
              <CategoryListTable 
                categories={categoriesData.categories}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              {/* 페이지네이션 */}
              {categoriesData.totalPages > 1 && (
                <CategoryPagination 
                  currentPage={currentPage}
                  totalPages={categoriesData.totalPages}
                  totalCount={categoriesData.totalCount}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm || selectedLevel ? '검색 결과가 없습니다.' : '등록된 카테고리가 없습니다.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryList;
