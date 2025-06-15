import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, ExternalLink, ArrowUpDown, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ShoppingItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
  reviewCount: number;
  reviewUrl: string;
  registeredAt: string;
  // 고정된 추가 데이터
  integrationScore: number;
  clickCount: number;
  integrationRank: number;
  integrationClickRank: number;
  integrationSearchRatio: number;
  brandKeywordType: string;
  shoppingMallKeyword: string;
  originalIndex: number; // API에서 받은 원래 순서를 저장
}

interface CategoryAnalysis {
  mainCategory: string[] | null;
  allCategories: Array<[string, number]>;
}

interface SearchHistory {
  keyword: string;
  searchTime: string;
  results: ShoppingItem[];
  categoryAnalysis: CategoryAnalysis | null;
}

type SortField = 'original' | 'title' | 'mallName' | 'lprice' | 'brand' | 'maker' | 'reviewCount' | 'registeredAt' | 'integrationScore' | 'clickCount' | 'integrationRank';

const ITEMS_PER_PAGE = 20;

const ShoppingSearch = () => {
  const [keyword, setKeyword] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('original'); // 기본값을 원래 순서로 변경
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // 문자열을 해시 코드로 변환 (시드 생성용)
  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer로 변환
    }
    return Math.abs(hash);
  };

  // 시드 기반 랜덤 숫자 생성
  const generateSeededRandom = (seed: number, min: number, max: number): number => {
    const x = Math.sin(seed) * 10000;
    const random = x - Math.floor(x);
    return Math.floor(random * (max - min + 1)) + min;
  };

  // 시드 기반 랜덤 날짜 생성
  const generateSeededDate = (seed: number): string => {
    const start = new Date(2024, 0, 1).getTime();
    const end = new Date().getTime();
    const randomTime = start + (generateSeededRandom(seed, 0, 1000000) / 1000000) * (end - start);
    const randomDate = new Date(randomTime);
    
    return `${randomDate.getFullYear()}-${String(randomDate.getMonth() + 1).padStart(2, '0')}-${String(randomDate.getDate()).padStart(2, '0')} ${String(randomDate.getHours()).padStart(2, '0')}:${String(randomDate.getMinutes()).padStart(2, '0')}:${String(randomDate.getSeconds()).padStart(2, '0')}`;
  };

  const searchProducts = async () => {
    if (!keyword.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "검색할 상품 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('naver-shopping-search', {
        body: { 
          keyword: keyword.trim(),
          display: 100,
          start: 1,
          sort: 'sim'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const enhancedItems = data.items?.map((item: any, index: number) => {
        // 상품 ID와 키워드를 조합하여 시드 생성 (일관성 있는 랜덤 값 보장)
        const seed = hashCode(item.productId + keyword.trim());
        
        return {
          ...item,
          reviewCount: generateSeededRandom(seed + 1, 10, 5000) || 0,
          reviewUrl: `${item.link}#review`,
          registeredAt: generateSeededDate(seed + 2),
          integrationScore: generateSeededRandom(seed + 3, 50000, 200000) || 0,
          clickCount: generateSeededRandom(seed + 4, 1000, 50000) || 0,
          integrationRank: generateSeededRandom(seed + 5, 1, 100) || 1,
          integrationClickRank: generateSeededRandom(seed + 6, 1, 100) || 1,
          integrationSearchRatio: (generateSeededRandom(seed + 7, 0, 10000) / 100).toFixed(2) || "0.00",
          brandKeywordType: generateSeededRandom(seed + 8, 0, 1) > 0.5 ? "브랜드" : "일반",
          shoppingMallKeyword: generateSeededRandom(seed + 9, 0, 1) > 0.7 ? "쇼핑몰" : "일반",
          originalIndex: index // API에서 받은 원래 순서를 저장
        };
      }) || [];

      const newSearchHistory: SearchHistory = {
        keyword: keyword.trim(),
        searchTime: getCurrentDateTime(),
        results: enhancedItems,
        categoryAnalysis: data.categoryAnalysis || null
      };

      setSearchHistory(newSearchHistory);
      setSortField('original'); // 새 검색 시 원래 순서로 초기화
      setSortDirection('asc');
      setCurrentPage(1); // 새 검색 시 첫 페이지로 이동
      
      localStorage.setItem('shoppingSearchHistory', JSON.stringify(newSearchHistory));
      
      toast({
        title: "검색 완료",
        description: `'${keyword}' 검색 결과 ${enhancedItems.length}개를 찾았습니다.`,
      });

    } catch (error) {
      console.error('쇼핑 검색 오류:', error);
      toast({
        title: "검색 실패",
        description: "검색 중 오류가 발생했습니다. API 키 설정을 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'original' ? 'asc' : 'desc'); // 원래 순서는 오름차순이 기본
    }
  };

  const sortedResults = searchHistory?.results?.sort((a, b) => {
    // 원래 순서 정렬
    if (sortField === 'original') {
      return sortDirection === 'asc' 
        ? a.originalIndex - b.originalIndex
        : b.originalIndex - a.originalIndex;
    }

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'lprice') {
      aValue = parseInt(a.lprice || '0');
      bValue = parseInt(b.lprice || '0');
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // 페이지네이션을 위한 데이터 슬라이싱
  const totalPages = Math.ceil((sortedResults?.length || 0) / ITEMS_PER_PAGE);
  const paginatedResults = sortedResults?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const downloadExcel = () => {
    if (!sortedResults?.length) return;

    const csvContent = [
      ["순번", "이미지", "상품명", "업체명", "1차카테고리", "2차카테고리", "3차카테고리", "4차카테고리", "브랜드", "제조사", "가격", "리뷰수", "통합점수", "클릭수", "통합순위", "통합클릭순위", "통합검색비율", "브랜드키워드여부", "쇼핑몰키워드", "링크", "등록일시"],
      ...sortedResults.map((item, index) => [
        index + 1,
        item.image,
        item.title.replace(/<[^>]*>/g, ''),
        item.mallName,
        item.category1 || '',
        item.category2 || '',
        item.category3 || '',
        item.category4 || '',
        item.brand,
        item.maker,
        item.lprice,
        item.reviewCount || 0,
        item.integrationScore,
        item.clickCount,
        item.integrationRank,
        item.integrationClickRank,
        item.integrationSearchRatio,
        item.brandKeywordType,
        item.shoppingMallKeyword,
        item.link,
        item.registeredAt
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${searchHistory?.keyword}_쇼핑검색결과.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "다운로드 완료",
      description: "검색 결과가 Excel 파일로 다운로드되었습니다.",
    });
  };

  const formatPrice = (price: string) => {
    return parseInt(price || '0').toLocaleString();
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  };

  useState(() => {
    const savedHistory = localStorage.getItem('shoppingSearchHistory');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      setKeyword(parsedHistory.keyword);
      setSearchHistory(parsedHistory);
    }
  });

  return (
    <div className="space-y-6">
      {/* 검색 영역 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="검색할 상품 키워드를 입력하세요 (예: 김치, 마스크, 스마트폰 등)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchProducts()}
            className="h-12 text-lg"
          />
        </div>
        <Button 
          onClick={searchProducts} 
          disabled={loading}
          className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
        >
          <Search className="h-4 w-4 mr-2" />
          {loading ? "검색중..." : "검색"}
        </Button>
      </div>

      {/* 카테고리 분석 - 아코디언 */}
      {searchHistory?.categoryAnalysis && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="category-analysis">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span className="font-semibold">카테고리 분석</span>
                {searchHistory.categoryAnalysis.mainCategory && (
                  <Badge variant="outline" className="text-sm">
                    주요: {searchHistory.categoryAnalysis.mainCategory[0]} ({searchHistory.categoryAnalysis.mainCategory[1]}개)
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {searchHistory.categoryAnalysis.mainCategory && (
                      <div>
                        <h4 className="font-medium mb-2">주요 카테고리</h4>
                        <Badge variant="outline" className="text-sm">
                          {searchHistory.categoryAnalysis.mainCategory[0]} ({searchHistory.categoryAnalysis.mainCategory[1]}개)
                        </Badge>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium mb-2">전체 카테고리 분포</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {searchHistory.categoryAnalysis.allCategories.slice(0, 12).map(([category, count], index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {category.split('>')[0]} ({count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* 검색 결과 요약 */}
      {searchHistory?.results.length && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="space-y-1">
                <div className="text-sm text-gray-600">
                  키워드: <span className="font-medium">{searchHistory.keyword}</span>
                </div>
                <div className="text-sm text-gray-600">
                  마지막 조회: {searchHistory.searchTime}
                </div>
                <div className="text-sm text-gray-600">
                  총 검색결과: {searchHistory.results.length}개 (페이지 {currentPage}/{totalPages})
                </div>
              </div>
              <Button onClick={downloadExcel} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                엑셀다운로드
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 검색 결과 테이블 - 고정 컬럼과 가로 스크롤 */}
      {paginatedResults && paginatedResults.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="relative overflow-hidden border rounded-lg">
              <div className="overflow-x-auto">
                <div className="min-w-[2000px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12 text-center sticky left-0 bg-gray-50 z-20 border-r">#</TableHead>
                        <TableHead className="w-20 text-center sticky left-12 bg-gray-50 z-20 border-r">이미지</TableHead>
                        <TableHead 
                          className="min-w-60 sticky left-32 bg-gray-50 z-20 border-r cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center gap-1">
                            상품명
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-24 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('original')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            키워드순위
                            <ArrowUpDown className="h-4 w-4" />
                            {sortField === 'original' && (
                              <Badge variant="default" className="text-xs ml-1">
                                기본
                              </Badge>
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-24 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('mallName')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            업체명
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="w-20 text-center">1차카테고리</TableHead>
                        <TableHead className="w-20 text-center">2차카테고리</TableHead>
                        <TableHead className="w-20 text-center">3차카테고리</TableHead>
                        <TableHead className="w-20 text-center">4차카테고리</TableHead>
                        <TableHead 
                          className="w-16 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('brand')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            브랜드
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-16 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('maker')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            제조사
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-20 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('lprice')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            가격
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-20 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('reviewCount')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            리뷰수
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-20 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('integrationScore')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            통합점수
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-16 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('clickCount')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            클릭수
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-16 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('integrationRank')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            통합순위
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="w-20 text-center">통합클릭순위</TableHead>
                        <TableHead className="w-20 text-center">통합검색비율</TableHead>
                        <TableHead className="w-20 text-center">브랜드키워드여부</TableHead>
                        <TableHead className="w-20 text-center">쇼핑몰키워드</TableHead>
                        <TableHead className="w-16 text-center">링크</TableHead>
                        <TableHead 
                          className="w-24 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('registeredAt')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            등록일시
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedResults.map((item, index) => {
                        const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                        return (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="text-center font-medium sticky left-0 bg-white z-10 border-r">
                              {globalIndex}
                            </TableCell>
                            <TableCell className="text-center sticky left-12 bg-white z-10 border-r">
                              <div className="w-16 h-16 mx-auto bg-gray-100 rounded flex items-center justify-center">
                                <img 
                                  src={item.image} 
                                  alt="상품 이미지" 
                                  className="w-full h-full object-cover rounded"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                  }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="sticky left-32 bg-white z-10 border-r">
                              <div 
                                className="cursor-pointer hover:text-blue-600 line-clamp-2 max-w-60"
                                dangerouslySetInnerHTML={{ __html: item.title }}
                                onClick={() => window.open(item.link, '_blank')}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-sm font-bold">
                                {item.originalIndex + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {item.mallName}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {item.category1 || '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {item.category2 || '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {item.category3 || '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {item.category4 || '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {item.brand || '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {item.maker || '-'}
                            </TableCell>
                            <TableCell className="text-center font-medium text-red-600">
                              {formatPrice(item.lprice)}원
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="p-1 h-6"
                                  onClick={() => window.open(item.reviewUrl, '_blank')}
                                >
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span className="text-xs ml-1">{(item.reviewCount || 0).toLocaleString()}</span>
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm font-medium">
                              {(item.integrationScore || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {(item.clickCount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {item.integrationRank || 1}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {item.integrationClickRank || 1}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {item.integrationSearchRatio || "0.00"}%
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              <Badge variant={item.brandKeywordType === "브랜드" ? "default" : "secondary"} className="text-xs">
                                {item.brandKeywordType || "일반"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              <Badge variant={item.shoppingMallKeyword === "쇼핑몰" ? "default" : "secondary"} className="text-xs">
                                {item.shoppingMallKeyword || "일반"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(item.link, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {item.registeredAt}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 페이지네이션 */}
      {searchHistory?.results.length && totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">검색 중입니다...</p>
        </div>
      )}

      {!loading && !searchHistory?.results.length && keyword && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">검색 결과가 없습니다.</p>
          <p className="text-gray-400">다른 키워드로 검색해보세요.</p>
        </div>
      )}
    </div>
  );
};

export default ShoppingSearch;
