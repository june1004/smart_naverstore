
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

type SortField = 'category_id' | 'category_name' | 'category_level' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface CategoryListProps {
  selectedLevel: number | null;
  onLevelFilter: (level: number | null) => void;
}

const CategoryList = ({ selectedLevel, onLevelFilter }: CategoryListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<SortField>('category_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 카테고리 목록 조회 (페이지네이션 및 정렬 포함)
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['naver-categories-paginated', searchTerm, selectedLevel, currentPage, itemsPerPage, sortField, sortDirection],
    queryFn: async () => {
      console.log('카테고리 목록 조회 시작:', { searchTerm, selectedLevel, currentPage, sortField, sortDirection });
      
      let query = supabase
        .from('naver_categories')
        .select('*', { count: 'exact' });

      // 검색 조건 추가
      if (searchTerm) {
        query = query.or(`category_name.ilike.%${searchTerm}%,category_id.ilike.%${searchTerm}%,category_path.ilike.%${searchTerm}%`);
      }

      // 레벨 필터 추가
      if (selectedLevel !== null) {
        query = query.eq('category_level', selectedLevel);
      }

      // 정렬 추가
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // 페이지네이션 적용
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) {
        console.error('카테고리 목록 조회 오류:', error);
        throw error;
      }

      console.log('카테고리 목록 조회 완료:', { count, dataLength: data?.length });
      
      return {
        categories: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
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
              placeholder="카테고리명, ID, 경로로 검색..."
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
              <div className="border rounded-lg">
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
                          onClick={() => handleSort('category_name')}
                          className="flex items-center gap-2 p-0 h-auto font-medium"
                        >
                          카테고리명 {getSortIcon('category_name')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('category_level')}
                          className="flex items-center gap-2 p-0 h-auto font-medium"
                        >
                          분류 {getSortIcon('category_level')}
                        </Button>
                      </TableHead>
                      <TableHead>경로</TableHead>
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
                        <TableCell className="font-mono text-sm">
                          {category.category_id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {category.category_name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getLevelColor(category.category_level)}>
                            {getLevelName(category.category_level)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-gray-600">
                          {category.category_path || '-'}
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
