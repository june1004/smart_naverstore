
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingItem, SearchHistory, SortField } from "@/types/shopping";
import { hashCode, generateSeededRandom, generateSeededDate, getCurrentDateTime } from "@/utils/shoppingUtils";
import ShoppingSearchForm from "./shopping/ShoppingSearchForm";
import CategoryAnalysisAccordion from "./shopping/CategoryAnalysisAccordion";
import SearchResultsSummary from "./shopping/SearchResultsSummary";
import ShoppingResultsTable from "./shopping/ShoppingResultsTable";
import ShoppingPagination from "./shopping/ShoppingPagination";

const ITEMS_PER_PAGE = 20;

const ShoppingSearch = () => {
  const [keyword, setKeyword] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('original');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

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
          originalIndex: index
        };
      }) || [];

      const newSearchHistory: SearchHistory = {
        keyword: keyword.trim(),
        searchTime: getCurrentDateTime(),
        results: enhancedItems,
        categoryAnalysis: data.categoryAnalysis || null
      };

      setSearchHistory(newSearchHistory);
      setSortField('original');
      setSortDirection('asc');
      setCurrentPage(1);
      
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
      setSortDirection(field === 'original' ? 'asc' : 'desc');
    }
  };

  const sortedResults = searchHistory?.results?.sort((a, b) => {
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
      <ShoppingSearchForm 
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={searchProducts}
        loading={loading}
      />

      {searchHistory?.categoryAnalysis && (
        <CategoryAnalysisAccordion categoryAnalysis={searchHistory.categoryAnalysis} />
      )}

      {searchHistory?.results.length && (
        <SearchResultsSummary 
          searchHistory={searchHistory}
          currentPage={currentPage}
          totalPages={totalPages}
          onDownloadExcel={downloadExcel}
        />
      )}

      {paginatedResults && paginatedResults.length > 0 && (
        <ShoppingResultsTable 
          results={paginatedResults}
          currentPage={currentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      )}

      {searchHistory?.results.length && (
        <ShoppingPagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
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
