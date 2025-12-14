import { useState, useEffect, MutableRefObject, useMemo } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useSearchHistory } from "@/hooks/use-search-history";
import CategoryDrilldownBar from "./CategoryDrilldownBar";

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
  parent_category_id?: string;
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
  const [selectedMediumCategory, setSelectedMediumCategory] = useState<string | null>(null);
  const [selectedSmallCategory, setSelectedSmallCategory] = useState<string | null>(null);
  const [selectedSmallestCategory, setSelectedSmallestCategory] = useState<string | null>(null);
  const [showAllMedium, setShowAllMedium] = useState(false);
  const [showAllSmall, setShowAllSmall] = useState(false);
  const [showAllSmallest, setShowAllSmallest] = useState(false);

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
      created_at: category.created_at,
      parent_category_id: category.parent_category_id,
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
      // --- 모든 row를 1000개씩 반복적으로 fetch해서 합치는 함수 ---
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

      // 검색 조건 추가 (단일 키워드 검색 지원)
      if (searchTerm) {
        const searchQuery = buildSearchQuery(searchTerm);
        if (searchQuery) {
          query = query.or(searchQuery);
        }
      }

          // 정렬
          if (selectedLevel !== null) {
        if (sortField !== 'category_hierarchy') {
          query = query.order(sortField, { ascending: sortDirection === 'asc' });
        } else {
          query = query.order('category_id', { ascending: true });
        }
      }

          const { data, error } = await query;
      if (error) throw error;
          if (!data || data.length === 0) break;
          allRows.push(...data);
          if (data.length < batchSize) {
            keepGoing = false;
          } else {
            from += batchSize;
          }
        }
        return allRows;
      }

      // 실제 데이터 fetch
      const data = await fetchAllCategories();

      // 카테고리 데이터 파싱
      const parsedCategoriesAll = data ? data.map(parseCategoryPath) : []; // 항상 전체 row
      let parsedCategories = [...parsedCategoriesAll];

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

  // 드릴다운 핸들러
  const handleLargeCategoryClick = (largeCategory: string) => {
    setSelectedLargeCategory(largeCategory === selectedLargeCategory ? null : largeCategory);
    setSelectedMediumCategory(null);
    setSelectedSmallCategory(null);
    setSelectedSmallestCategory(null);
  };
  const handleMediumCategoryClick = (mediumCategory: string) => {
    setSelectedMediumCategory(mediumCategory === selectedMediumCategory ? null : mediumCategory);
    setSelectedSmallCategory(null);
    setSelectedSmallestCategory(null);
  };
  const handleSmallCategoryClick = (smallCategory: string) => {
    setSelectedSmallCategory(smallCategory === selectedSmallCategory ? null : smallCategory);
    setSelectedSmallestCategory(null);
  };
  const handleSmallestCategoryClick = (smallestCategory: string) => {
    setSelectedSmallestCategory(smallestCategory === selectedSmallestCategory ? null : smallestCategory);
  };
  const handleBackToLarge = () => {
    setSelectedLargeCategory(null);
    setSelectedMediumCategory(null);
    setSelectedSmallCategory(null);
    setSelectedSmallestCategory(null);
  };
  const handleBackToMedium = () => {
    setSelectedMediumCategory(null);
    setSelectedSmallCategory(null);
    setSelectedSmallestCategory(null);
  };
  const handleBackToSmall = () => {
    setSelectedSmallCategory(null);
    setSelectedSmallestCategory(null);
  };

  // 대분류만 추출 (category_level === 1, 대분류명 기준 unique)
  const all = categoriesData?.parsedCategoriesAll || [];

  // 드릴다운 바에 사용할 분류 데이터 메모이제이션 (all 이후로 이동)
  const allCategoryParts = useMemo(() => all.map(c => parseCategoryPathParts(c.category_path)), [all]);
  const largeOptions = useMemo(() => Array.from(new Set(allCategoryParts.map(p => p.large))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')), [allCategoryParts]);
  const mediumOptions = useMemo(() => selectedLargeCategory ? Array.from(new Set(allCategoryParts.filter(p => matchCategory(p.large, selectedLargeCategory)).map(p => p.medium))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')) : [], [allCategoryParts, selectedLargeCategory]);
  const smallOptions = useMemo(() => selectedLargeCategory && selectedMediumCategory ? Array.from(new Set(allCategoryParts.filter(p => matchCategory(p.large, selectedLargeCategory) && matchCategory(p.medium, selectedMediumCategory)).map(p => p.small))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')) : [], [allCategoryParts, selectedLargeCategory, selectedMediumCategory]);
  const smallestOptions = useMemo(() => selectedLargeCategory && selectedMediumCategory && selectedSmallCategory ? Array.from(new Set(allCategoryParts.filter(p => matchCategory(p.large, selectedLargeCategory) && matchCategory(p.medium, selectedMediumCategory) && matchCategory(p.small, selectedSmallCategory)).map(p => p.smallest))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')) : [], [allCategoryParts, selectedLargeCategory, selectedMediumCategory, selectedSmallCategory]);

  // 자동완성용 상태 (all 이후로 이동)
  const [largeSearch, setLargeSearch] = useState("");
  const [mediumSearch, setMediumSearch] = useState("");
  const [smallSearch, setSmallSearch] = useState("");
  const [smallestSearch, setSmallestSearch] = useState("");

  // 검색 히스토리 훅
  const largeHistory = useSearchHistory('category-large');
  const mediumHistory = useSearchHistory('category-medium');
  const smallHistory = useSearchHistory('category-small');
  const smallestHistory = useSearchHistory('category-smallest');

  // 대분류만 추출 (category_level === 1, 대분류명 기준 unique)
  const largeCategories = Array.from(
    new Map(
      all
        .filter(c => c.category_level === 1 && c.large_category)
        .map(c => [normalizeCategoryName(c.large_category), c])
    ).values()
  );

  // 네이버 기준 11개 대분류명, 지정 순서
  const NAVER_LARGE_CATEGORIES = [
    '가구/인테리어',
    '도서',
    '디지털/가전',
    '생활/건강',
    '스포츠/레저',
    '식품',
    '여가/생활편의',
    '출산/육아',
    '패션의류',
    '패션잡화',
    '화장품/미용',
  ];

  // 문자열 normalize (공백/대소문자 및 특수문자 제거)
  function normalizeCategoryName(str: string) {
    return (str || '')
      .replace(/[\s/\-_,·|]/g, '') // 공백, /, -, _, ,, ·, | 모두 제거
      .toLowerCase();
  }
  function matchCategory(a: string, b: string) {
    return normalizeCategoryName(a) === normalizeCategoryName(b);
  }

  // 대분류 유연 매칭 함수: category_level === 1, category_name, category_path 첫 파트 등도 포함
  function matchLargeCategoryFlexible(row: ParsedCategory, selected: string) {
    if (row.category_level === 1 && matchCategory(row.large_category, selected)) return true;
    const candidates = [
      row.large_category,
      row.category_name,
      (row.category_path || '').split(' > ')[0] || '',
    ].filter(Boolean);
    return candidates.some(val => matchCategory(val, selected));
  }

  // 계층별 파싱 함수
  function parseCategoryPathParts(category_path: string = '') {
    const parts = (category_path || '').split(' > ').map(s => (s || '').trim());
    return {
      large: parts[0] || '',
      medium: parts[1] || '',
      small: parts[2] || '',
      smallest: parts[3] || '',
    };
  }

  // 드릴다운 필터링 + 정렬 + 페이지네이션 일괄 적용 (대분류 필터링 강화)
  let filtered = all;
  let filterInfo = '';
  if (selectedLargeCategory && !selectedMediumCategory && !selectedSmallCategory) {
    filtered = all.filter(c => {
      // 대분류 후보군에서 normalizeCategoryName로 비교
      const parts = parseCategoryPathParts(c.category_path);
      return matchCategory(parts.large, selectedLargeCategory);
    });
    filterInfo = `대분류: "${selectedLargeCategory}" (${filtered.length}개)`;
  } else if (selectedLargeCategory && selectedMediumCategory && !selectedSmallCategory) {
    filtered = all.filter(c => {
      const parts = parseCategoryPathParts(c.category_path);
      return matchCategory(parts.large, selectedLargeCategory) && matchCategory(parts.medium, selectedMediumCategory);
    });
    filterInfo = `중분류: "${selectedMediumCategory}" (${filtered.length}개)`;
    if (showAllMedium) filterInfo += ' - 전체 중분류 보기';
  } else if (selectedLargeCategory && selectedMediumCategory && selectedSmallCategory) {
    filtered = all.filter(c => {
      const parts = parseCategoryPathParts(c.category_path);
      return matchCategory(parts.large, selectedLargeCategory) && matchCategory(parts.medium, selectedMediumCategory) && matchCategory(parts.small, selectedSmallCategory);
    });
    filterInfo = `소분류: "${selectedSmallCategory}" (${filtered.length}개)`;
    if (showAllSmallest) filterInfo += ' - 전체 세분류 보기';
  } else {
    filterInfo = `전체 (${categoriesData?.totalCount || 0}개)`;
  }

  // 정렬
  if (sortField === 'category_hierarchy') {
    filtered = filtered.sort((a, b) => sortByHierarchy(a, b, sortDirection));
  } else {
    filtered = filtered.sort((a, b) => {
      if (sortDirection === 'asc') {
        return (a[sortField] || '').localeCompare(b[sortField] || '', 'ko');
      } else {
        return (b[sortField] || '').localeCompare(a[sortField] || '', 'ko');
      }
    });
  }

  // 페이지네이션
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = filtered.slice(startIndex, endIndex);

  let displayCategories = paginatedCategories;

  if (categoriesError) {
    console.error('카테고리 로딩 오류:', categoriesError);
  }

  const mediumCategories = Array.from(
    new Set(
      all
        .filter(c => matchCategory(parseCategoryPathParts(c.category_path).large, selectedLargeCategory) && parseCategoryPathParts(c.category_path).medium)
        .map(c => parseCategoryPathParts(c.category_path).medium)
    )
  ).filter(Boolean);

  console.log('selectedLargeCategory:', selectedLargeCategory);
  console.log('all rows:', all.map(c => c.category_path));
  console.log('중분류 후보군:', mediumCategories);

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
        {/* 드릴다운 바 UI */}
        <div className="flex flex-col gap-2 mt-4">
          <Breadcrumb>
            {selectedLargeCategory && <BreadcrumbItem>{selectedLargeCategory}</BreadcrumbItem>}
            {selectedMediumCategory && <><BreadcrumbSeparator /> <BreadcrumbItem>{selectedMediumCategory}</BreadcrumbItem></>}
            {selectedSmallCategory && <><BreadcrumbSeparator /> <BreadcrumbItem>{selectedSmallCategory}</BreadcrumbItem></>}
            {selectedSmallestCategory && <><BreadcrumbSeparator /> <BreadcrumbItem>{selectedSmallestCategory}</BreadcrumbItem></>}
          </Breadcrumb>
          <div className="flex gap-2">
            <CategoryDrilldownBar
              all={all}
              parseCategoryPathParts={parseCategoryPathParts}
              matchCategory={matchCategory}
              selectedLargeCategory={selectedLargeCategory}
              setSelectedLargeCategory={setSelectedLargeCategory}
              selectedMediumCategory={selectedMediumCategory}
              setSelectedMediumCategory={setSelectedMediumCategory}
              selectedSmallCategory={selectedSmallCategory}
              setSelectedSmallCategory={setSelectedSmallCategory}
              selectedSmallestCategory={selectedSmallestCategory}
              setSelectedSmallestCategory={setSelectedSmallestCategory}
            />
          </div>
        </div>
        {/* 현재 필터/분류/갯수 안내 */}
        <div className="mt-2 text-sm text-blue-700 font-semibold">
          {filterInfo}
        </div>
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
            {/* 초기화 버튼 */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSortField('category_hierarchy');
                setSortDirection('asc');
                setCurrentPage(1);
                setSelectedLargeCategory(null);
                setSelectedMediumCategory(null);
                setSelectedSmallCategory(null);
                setSelectedSmallestCategory(null);
                if (refetch) refetch();
              }}
            >
              초기화
            </Button>
          </div>
          {/* 대분류 버튼 */}
          {!selectedLargeCategory && (
            <div className="flex flex-wrap gap-2 mt-2">
              {NAVER_LARGE_CATEGORIES.map((name) => (
                <Button
                  key={name}
                  size="sm"
                  variant={normalizeCategoryName(selectedLargeCategory) === normalizeCategoryName(name) ? 'default' : 'outline'}
                  onClick={() => handleLargeCategoryClick(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          )}
          {/* 중분류 버튼 */}
          {selectedLargeCategory && !selectedMediumCategory && (
            <div className="flex flex-wrap gap-2 mt-2 max-h-[300px] overflow-y-auto">
              <Button size="sm" variant="outline" onClick={handleBackToLarge}>상위로</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAllMedium(v => !v)}>{showAllMedium ? '중분류 접기' : '전체 중분류 보기'}</Button>
              {Array.from(new Set(
                all
                  .filter(c => matchCategory(parseCategoryPathParts(c.category_path).large, selectedLargeCategory) && parseCategoryPathParts(c.category_path).medium)
                  .map(c => parseCategoryPathParts(c.category_path).medium)
              ))
                .filter(Boolean)
                .map(medium => (
                <Button
                  key={medium}
                  size="sm"
                  variant={selectedMediumCategory === medium ? 'default' : 'outline'}
                  onClick={() => handleMediumCategoryClick(medium)}
                >
                  {medium}
                </Button>
              ))}
            </div>
          )}
          {/* 소분류 버튼 */}
          {selectedLargeCategory && selectedMediumCategory && !selectedSmallCategory && (
            <div className="flex flex-wrap gap-2 mt-2 max-h-[300px] overflow-y-auto">
              <Button size="sm" variant="outline" onClick={handleBackToMedium}>상위로</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAllSmall(v => !v)}>{showAllSmall ? '소분류 접기' : '전체 소분류 보기'}</Button>
              {Array.from(new Set(
                all
                  .filter(c =>
                    matchCategory(parseCategoryPathParts(c.category_path).large, selectedLargeCategory) &&
                    matchCategory(parseCategoryPathParts(c.category_path).medium, selectedMediumCategory) &&
                    parseCategoryPathParts(c.category_path).small
                  )
                  .map(c => parseCategoryPathParts(c.category_path).small)
              ))
                .filter(Boolean)
                .map(small => (
                <Button
                  key={small}
                  size="sm"
                  variant={selectedSmallCategory === small ? 'default' : 'outline'}
                  onClick={() => handleSmallCategoryClick(small)}
                >
                  {small}
                </Button>
              ))}
            </div>
          )}
          {/* 세분류 버튼 */}
          {selectedLargeCategory && selectedMediumCategory && selectedSmallCategory && (
            <div className="flex flex-wrap gap-2 mt-2 max-h-[300px] overflow-y-auto">
              <Button size="sm" variant="outline" onClick={handleBackToSmall}>상위로</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAllSmallest(v => !v)}>{showAllSmallest ? '세분류 접기' : '전체 세분류 보기'}</Button>
              {Array.from(new Set(
                all
                  .filter(c =>
                    matchCategory(parseCategoryPathParts(c.category_path).large, selectedLargeCategory) &&
                    matchCategory(parseCategoryPathParts(c.category_path).medium, selectedMediumCategory) &&
                    matchCategory(parseCategoryPathParts(c.category_path).small, selectedSmallCategory) &&
                    parseCategoryPathParts(c.category_path).smallest
                  )
                  .map(c => parseCategoryPathParts(c.category_path).smallest)
              ))
                .filter(Boolean)
                .map(smallest => (
                <Button
                  key={smallest}
                  size="sm"
                    variant={selectedSmallestCategory === smallest ? 'default' : 'outline'}
                    onClick={() => handleSmallestCategoryClick(smallest)}
                >
                  {smallest}
                </Button>
              ))}
            </div>
          )}
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
          ) : displayCategories.length > 0 ? (
            <>
              <CategoryListTable 
                categories={displayCategories}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              {/* 페이지네이션 */}
              {categoriesData.totalPages > 1 && (
                <CategoryPagination 
                  currentPage={currentPage}
                  totalPages={categoriesData.totalPages}
                  totalCount={displayCategories.length}
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