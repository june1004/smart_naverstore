
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  micro_category: string;
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
}

const CategoryList = ({ selectedLevel, onLevelFilter }: CategoryListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<SortField>('category_hierarchy');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 카테고리 경로를 파싱하여 각 분류 레벨을 추출하는 함수
  const parseCategoryPath = (category: Category): ParsedCategory => {
    const pathParts = category.category_path ? category.category_path.split(' > ') : [];
    
    return {
      id: category.id,
      category_id: category.category_id,
      category_name: category.category_name,
      large_category: pathParts[0] || '',
      medium_category: pathParts[1] || '',
      small_category: pathParts[2] || '',
      micro_category: pathParts[3] || '',
      category_level: category.category_level,
      category_path: category.category_path || '',
      is_active: category.is_active,
      created_at: category.created_at
    };
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
    const smallCompare = a.small_category.localeCompare(b.small_category, 'ko');
    if (smallCompare !== 0) {
      return direction === 'asc' ? smallCompare : -smallCompare;
    }
    
    // 세분류 비교
    return direction === 'asc' ? 
      a.micro_category.localeCompare(b.micro_category, 'ko') : 
      b.micro_category.localeCompare(a.micro_category, 'ko');
  };

  // 단일 키워드 검색을 위한 함수
  const buildSearchQuery = (searchTerm: string) => {
    if (!searchTerm) return '';
    
    const trimmedTerm = searchTerm.trim();
    
    // 단일 키워드로 모든 필드에서 검색
    return `category_name.ilike.%${trimmedTerm}%,category_id.ilike.%${trimmedTerm}%,category_path.ilike.%${trimmedTerm}%`;
  };

  // 카테고리 목록 조회
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['naver-categories-paginated', searchTerm, selectedLevel, currentPage, itemsPerPage, sortField, sortDirection],
    queryFn: async () => {
      console.log('카테고리 목록 조회 시작:', { searchTerm, selectedLevel, currentPage, sortField, sortDirection });
      
      let query = supabase
        .from('naver_categories')
        .select('*', { count: 'exact' });
        // is_active 필터 제거하여 모든 카테고리 조회

      // 검색 조건 추가 (단일 키워드 검색 지원)
      if (searchTerm) {
        const searchQuery = buildSearchQuery(searchTerm);
        if (searchQuery) {
          query = query.or(searchQuery);
        }
      }

      // 레벨 필터 추가
      if (selectedLevel !== null) {
        query = query.eq('category_level', selectedLevel);
      }

      // 기본 정렬 (계층구조 정렬을 제외한 나머지)
      if (sortField !== 'category_hierarchy') {
        query = query.order(sortField, { ascending: sortDirection === 'asc' });
      } else {
        // 계층구조 정렬은 클라이언트 사이드에서 처리
        query = query.order('category_id', { ascending: true });
      }

      const { data, error, count } = await query;
      
      if (error) {
        console.error('카테고리 목록 조회 오류:', error);
        throw error;
      }

      console.log('카테고리 목록 조회 완료:', { count, dataLength: data?.length });
      
      // 카테고리 데이터 파싱
      let parsedCategories = data ? data.map(parseCategoryPath) : [];
      
      // 계층구조 정렬이 선택된 경우 클라이언트에서 정렬
      if (sortField === 'category_hierarchy') {
        parsedCategories.sort((a, b) => sortByHierarchy(a, b, sortDirection));
      }

      // 페이지네이션 적용 (계층구조 정렬의 경우 클라이언트에서 처리)
      let paginatedCategories = parsedCategories;
      let totalCount = count || 0;
      let totalPages = Math.ceil(totalCount / itemsPerPage);

      if (sortField === 'category_hierarchy') {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        paginatedCategories = parsedCategories.slice(startIndex, endIndex);
        totalCount = parsedCategories.length;
        totalPages = Math.ceil(totalCount / itemsPerPage);
      }
      
      return {
        categories: paginatedCategories,
        totalCount,
        totalPages
      };
    },
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getLevelName = (level: number) => {
    switch (level) {
      case 1: return '대분류';
      case 2: return '중분류';
      case 3: return '소분류';
      case 4: return '세분류';
      default: return `${level}분류`;
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-green-100 text-green-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 4: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
          등록된 네이버 카테고리 정보를 확인합니다.
          {categoriesData && ` (총 ${categoriesData.totalCount}개)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="카테고리명, ID, 분류명으로 검색... (예: 텐트, 50002649, 스포츠)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
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
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('category_id')}
                          className="flex items-center gap-2 p-0 h-auto font-medium"
                        >
                          카테고리 ID {getSortIcon('category_id')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('category_hierarchy')}
                          className="flex items-center gap-2 p-0 h-auto font-medium"
                        >
                          대분류 {getSortIcon('category_hierarchy')}
                        </Button>
                      </TableHead>
                      <TableHead>중분류</TableHead>
                      <TableHead>소분류</TableHead>
                      <TableHead>세분류</TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('category_path')}
                          className="flex items-center gap-2 p-0 h-auto font-medium"
                        >
                          카테고리 경로 {getSortIcon('category_path')}
                        </Button>
                      </TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('created_at')}
                          className="flex items-center gap-2 p-0 h-auto font-medium"
                        >
                          등록일 {getSortIcon('created_at')}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriesData.categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-mono text-sm font-medium">
                          {category.category_id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {category.large_category || '-'}
                        </TableCell>
                        <TableCell>
                          {category.medium_category || '-'}
                        </TableCell>
                        <TableCell>
                          {category.small_category || '-'}
                        </TableCell>
                        <TableCell>
                          {category.micro_category ? (
                            <span className="text-sm">{category.micro_category}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">없음</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          <div className="truncate" title={category.category_path}>
                            {category.category_path || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(category.created_at).toLocaleDateString('ko-KR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 페이지네이션 */}
              {categoriesData.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, categoriesData.totalPages) }, (_, i) => {
                        let pageNum;
                        if (categoriesData.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= categoriesData.totalPages - 2) {
                          pageNum = categoriesData.totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(Math.min(categoriesData.totalPages, currentPage + 1))}
                          className={currentPage === categoriesData.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              <div className="text-sm text-gray-500 text-center">
                페이지 {currentPage} / {categoriesData.totalPages} 
                (총 {categoriesData.totalCount}개 카테고리)
              </div>
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
