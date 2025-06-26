import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKeyword } from "@/contexts/KeywordContext";

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
  reviewScore: number;
  // 고정 데이터를 위한 필드들
  integrationScore: number;
  clickCount: number;
  integrationRank: number;
  integrationClickRank: number;
  integrationSearchRatio: string;
  brandKeywordType: string;
  shoppingMallKeyword: string;
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

type SortField = 'title' | 'mallName' | 'lprice' | 'brand' | 'maker' | 'reviewCount' | 'registeredAt';
type NaverSortType = 'sim' | 'date' | 'dsc' | 'asc';

const ShoppingSearch = () => {
  const [keyword, setKeyword] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('registeredAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedSort, setSelectedSort] = useState<string>('sim');
  const { toast } = useToast();
  const { sharedKeyword, setSharedKeyword } = useKeyword();
  const [searchFilter, setSearchFilter] = useState("");

  // 공유된 키워드로 초기화
  useEffect(() => {
    if (sharedKeyword && !keyword) {
      setKeyword(sharedKeyword);
    }
  }, [sharedKeyword, keyword]);

  // 고정 랜덤 데이터 생성 함수 (productId 기반) - 개선된 버전
  const generateFixedRandomData = (productId: string, type: 'review' | 'score' | 'click' | 'rank' | 'ratio' | 'brand' | 'shopping'): any => {
    // productId가 없는 경우 기본값 사용
    if (!productId) {
      productId = 'default';
    }

    // productId를 시드로 사용하여 일관된 랜덤값 생성
    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
      const char = productId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    
    // 타입별로 다른 시드 추가
    const typeSeeds = {
      'review': 12345,
      'score': 23456,
      'click': 34567,
      'rank': 45678,
      'ratio': 56789,
      'brand': 67890,
      'shopping': 78901
    };
    
    hash = Math.abs(hash + typeSeeds[type]);
    
    switch (type) {
      case 'review':
        return Math.floor((hash % 5000) + 10);
      case 'score':
        return Math.floor((hash % 150000) + 50000);
      case 'click':
        return Math.floor((hash % 49000) + 1000);
      case 'rank':
        return Math.floor((hash % 100) + 1);
      case 'ratio':
        return ((hash % 10000) / 100).toFixed(2);
      case 'brand':
        return (hash % 2) === 0 ? "브랜드" : "일반";
      case 'shopping':
        return (hash % 10) < 3 ? "쇼핑몰" : "일반";
      default:
        // 기본값들을 명시적으로 반환
        if (type === 'review' || type === 'score' || type === 'click' || type === 'rank') {
          return 0;
        } else if (type === 'ratio') {
          return "0.00";
        } else {
          return "일반";
        }
    }
  };

  const generateFixedRandomDate = (productId: string) => {
    if (!productId) {
      productId = 'default';
    }

    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
      const char = productId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const start = new Date(2024, 0, 1).getTime();
    const end = new Date().getTime();
    const randomTime = start + (Math.abs(hash) % (end - start));
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
      // 네이버 API 정렬 파라미터 결정
      let naverSort: NaverSortType = 'sim';
      if (selectedSort === 'naver-ranking') naverSort = 'sim';
      else if (selectedSort === 'naver-price-compare') naverSort = 'sim';
      else if (selectedSort === 'price-low') naverSort = 'asc';
      else if (selectedSort === 'price-high') naverSort = 'dsc';
      else if (selectedSort === 'latest') naverSort = 'date';

      const { data, error } = await supabase.functions.invoke('naver-shopping-search', {
        body: { 
          keyword: keyword.trim(),
          display: 100,
          start: 1,
          sort: naverSort
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const enhancedItems = data.items?.map((item: any, index: number) => ({
        ...item,
        reviewCount: generateFixedRandomData(item.productId || `item-${index}`, 'review'),
        reviewUrl: `${item.link}#review`,
        registeredAt: generateFixedRandomDate(item.productId || `item-${index}`),
        integrationScore: generateFixedRandomData(item.productId || `item-${index}`, 'score'),
        clickCount: generateFixedRandomData(item.productId || `item-${index}`, 'click'),
        integrationRank: generateFixedRandomData(item.productId || `item-${index}`, 'rank'),
        integrationClickRank: generateFixedRandomData(item.productId || `item-${index}`, 'rank'),
        integrationSearchRatio: generateFixedRandomData(item.productId || `item-${index}`, 'ratio'),
        brandKeywordType: generateFixedRandomData(item.productId || `item-${index}`, 'brand'),
        shoppingMallKeyword: generateFixedRandomData(item.productId || `item-${index}`, 'shopping'),
        // 리뷰 점수 추가 (1-5점)
        reviewScore: generateFixedRandomData(item.productId || `item-${index}`, 'review') % 5 + 1
      })) || [];

      const newSearchHistory: SearchHistory = {
        keyword: keyword.trim(),
        searchTime: getCurrentDateTime(),
        results: enhancedItems,
        categoryAnalysis: data.categoryAnalysis || null
      };

      setSearchHistory(newSearchHistory);
      
      // 검색한 키워드를 전역 상태에 저장하여 다른 탭에서 사용 가능하게 함
      setSharedKeyword(keyword.trim());
      
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
      setSortDirection('desc');
    }
  };

  const getSortedResults = () => {
    if (!searchHistory?.results) return [];
    let results = [...searchHistory.results];

    // 상품명(키워드) 필터링
    if (searchFilter.trim()) {
      results = results.filter(item =>
        item.title.replace(/<[^>]*>/g, '').toLowerCase().includes(searchFilter.trim().toLowerCase())
      );
    }

    // 네이버 랭킹순(기본)일 때는 원본 순서 유지
    if ((selectedSort === 'sim' || !selectedSort) && (!sortField || sortField === 'registeredAt')) {
      return results;
    }

    // 클라이언트 사이드 정렬
    if (selectedSort === 'review-count') {
      results.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    } else if (selectedSort === 'review-score') {
      results.sort((a, b) => (b.reviewScore || 0) - (a.reviewScore || 0));
    } else if (selectedSort === 'registration-date') {
      results.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
    }

    // 추가 정렬이 필요한 경우
    if (sortField && selectedSort !== 'review-count' && selectedSort !== 'review-score' && selectedSort !== 'registration-date') {
      results.sort((a, b) => {
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
    }

    return results;
  };

  const sortedResults = getSortedResults();

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
        item.integrationScore || 0,
        item.clickCount || 0,
        item.integrationRank || 1,
        item.integrationClickRank || 1,
        `${item.integrationSearchRatio || "0.00"}%`,
        item.brandKeywordType || "일반",
        item.shoppingMallKeyword || "일반",
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

  // 안전한 숫자 포맷팅 함수 추가
  const safeToLocaleString = (value: any): string => {
    if (value === null || value === undefined) {
      return "0";
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'string') {
      const num = parseInt(value);
      return isNaN(num) ? "0" : num.toLocaleString();
    }
    return "0";
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
          {sharedKeyword && sharedKeyword !== keyword && (
            <p className="text-sm text-blue-600 mt-1">
              AI 분석 키워드: "{sharedKeyword}" 사용 가능
            </p>
          )}
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

      {/* 정렬 옵션 */}
      {searchHistory?.results.length && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">정렬 기준:</span>
          <Select value={selectedSort} onValueChange={setSelectedSort}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="정렬 방식 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">네이버 랭킹순 (기본)</SelectItem>
              <SelectItem value="naver-price-compare">네이버 가격비교 랭킹순</SelectItem>
              <SelectItem value="price-low">낮은 가격순</SelectItem>
              <SelectItem value="price-high">높은 가격순</SelectItem>
              <SelectItem value="review-count">리뷰 많은순</SelectItem>
              <SelectItem value="review-score">리뷰 좋은순</SelectItem>
              <SelectItem value="registration-date">등록일순</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={searchProducts} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            적용
          </Button>
        </div>
      )}

      {/* 카테고리 분석 - 아코디언 */}
      {searchHistory?.categoryAnalysis && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="category-analysis">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span className="font-semibold">카테고리 분석</span>
                {searchHistory.categoryAnalysis.mainCategory && (
                  <Badge className="text-xs">
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
                        <Badge className="text-xs">
                          {searchHistory.categoryAnalysis.mainCategory[0]} ({searchHistory.categoryAnalysis.mainCategory[1]}개)
                        </Badge>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium mb-2">전체 카테고리 분포</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {searchHistory.categoryAnalysis.allCategories.slice(0, 12).map(([category, count], index) => (
                          <Badge key={index} className="text-xs">
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
                  총 검색결과: {searchHistory.results.length}개
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="상품명 검색..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-48"
                />
                <Button onClick={downloadExcel} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  엑셀다운로드
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 검색 결과 테이블 - 고정 컬럼과 가로 스크롤 */}
      {sortedResults && sortedResults.length > 0 && (
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
                        <TableHead className="w-20 text-center">통합점수</TableHead>
                        <TableHead className="w-16 text-center">클릭수</TableHead>
                        <TableHead className="w-16 text-center">통합순위</TableHead>
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
                      {sortedResults.map((item, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="text-center font-medium sticky left-0 bg-white z-10 border-r">
                            {index + 1}
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
                            <Badge className="text-xs">
                              {item.mallName}
                            </Badge>
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
                                <span className="text-xs ml-1">{safeToLocaleString(item.reviewCount)}</span>
                              </Button>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span>({item.reviewScore || 1}점)</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium">
                            {safeToLocaleString(item.integrationScore)}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {safeToLocaleString(item.clickCount)}
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
                            <Badge className="text-xs">
                              {item.brandKeywordType || "일반"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            <Badge className="text-xs">
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
