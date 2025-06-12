import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, ArrowUpDown, RotateCcw, Hash, Monitor, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import KeywordDetailModal from "./KeywordDetailModal";

interface RelatedKeyword {
  keyword: string;
  searchKeyword: string;
  monthlyPcSearchCount: number;
  monthlyMobileSearchCount: number;
  totalSearchCount: number;
  monthlyAvgPcClick: number;
  monthlyAvgMobileClick: number;
  totalAvgClick: number;
  monthlyAvgPcCtr: number;
  monthlyAvgMobileCtr: number;
  avgCtr: number;
  competition: string;
  competitionScore: number;
  plAvgDepth: number;
  originalIndex: number;
}

interface AutocompleteKeyword {
  keyword: string;
  searchVolume: number;
  competition: string;
  competitionScore: number;
  trend: string;
  cpc: number;
}

interface KeywordData {
  relatedKeywords: RelatedKeyword[];
  autocompleteKeywords: AutocompleteKeyword[];
  searchKeywords: string[];
}

type RelatedSortField = 'keyword' | 'searchKeyword' | 'totalSearchCount' | 'totalAvgClick' | 'avgCtr' | 'competition' | 'competitionScore' | 'plAvgDepth' | 'originalIndex';
type AutocompleteSortField = 'keyword' | 'searchVolume' | 'competition' | 'competitionScore' | 'trend' | 'cpc';

const ITEMS_PER_PAGE = 20;

const KeywordExtraction = () => {
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [originalKeywordData, setOriginalKeywordData] = useState<KeywordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("related");
  
  // Related keywords state
  const [relatedSortField, setRelatedSortField] = useState<RelatedSortField>('originalIndex');
  const [relatedSortDirection, setRelatedSortDirection] = useState<'asc' | 'desc'>('asc');
  const [relatedCurrentPage, setRelatedCurrentPage] = useState(1);
  
  // Autocomplete keywords state
  const [autocompleteSortField, setAutocompleteSortField] = useState<AutocompleteSortField>('searchVolume');
  const [autocompleteSortDirection, setAutocompleteSortDirection] = useState<'asc' | 'desc'>('desc');
  const [autocompleteCurrentPage, setAutocompleteCurrentPage] = useState(1);
  
  // Modal state
  const [selectedKeyword, setSelectedKeyword] = useState<RelatedKeyword | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { toast } = useToast();

  const extractKeywords = async () => {
    if (!keywordInput.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "추출할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 쉼표로 구분하여 키워드 배열 생성 (최대 5개)
    const keywords = keywordInput.split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, 5);

    if (keywords.length === 0) {
      toast({
        title: "유효한 키워드를 입력해주세요",
        description: "쉼표로 구분하여 최대 5개까지 입력 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('naver-searchad-keywords', {
        body: { keywords }
      });

      if (error) {
        throw new Error(error.message);
      }

      setKeywordData(data);
      setOriginalKeywordData(data); // 원본 데이터 저장
      setRelatedCurrentPage(1);
      setAutocompleteCurrentPage(1);
      setRelatedSortField('originalIndex');
      setRelatedSortDirection('asc');
      
      toast({
        title: "키워드 추출 완료",
        description: `${keywords.length}개 키워드 분석이 완료되었습니다.`,
      });

    } catch (error) {
      console.error('키워드 추출 오류:', error);
      toast({
        title: "추출 실패",
        description: "키워드 추출 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreOriginalOrder = () => {
    if (originalKeywordData) {
      setKeywordData(originalKeywordData);
      setRelatedSortField('originalIndex');
      setRelatedSortDirection('asc');
      setRelatedCurrentPage(1);
      
      toast({
        title: "순서 복원 완료",
        description: "원래 검색 순서로 복원되었습니다.",
      });
    }
  };

  const handleKeywordClick = (keyword: RelatedKeyword) => {
    setSelectedKeyword(keyword);
    setIsModalOpen(true);
  };

  const handleRelatedSort = (field: RelatedSortField) => {
    if (relatedSortField === field) {
      setRelatedSortDirection(relatedSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRelatedSortField(field);
      setRelatedSortDirection(field === 'originalIndex' ? 'asc' : 'desc');
    }
    setRelatedCurrentPage(1);
  };

  const handleAutocompleteSort = (field: AutocompleteSortField) => {
    if (autocompleteSortField === field) {
      setAutocompleteSortDirection(autocompleteSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAutocompleteSortField(field);
      setAutocompleteSortDirection('desc');
    }
    setAutocompleteCurrentPage(1);
  };

  const sortedRelatedKeywords = keywordData?.relatedKeywords?.sort((a, b) => {
    const aValue = a[relatedSortField];
    const bValue = b[relatedSortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return relatedSortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    const aNum = typeof aValue === 'string' ? parseFloat(aValue) : aValue;
    const bNum = typeof bValue === 'string' ? parseFloat(bValue) : bValue;
    
    return relatedSortDirection === 'asc' ? aNum - bNum : bNum - aNum;
  });

  const sortedAutocompleteKeywords = keywordData?.autocompleteKeywords?.sort((a, b) => {
    const aValue = a[autocompleteSortField];
    const bValue = b[autocompleteSortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return autocompleteSortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    const aNum = typeof aValue === 'string' ? parseFloat(aValue.toString()) : aValue;
    const bNum = typeof bValue === 'string' ? parseFloat(bValue.toString()) : bValue;
    
    return autocompleteSortDirection === 'asc' ? aNum - bNum : bNum - aNum;
  });

  // Pagination for related keywords
  const relatedTotalPages = Math.ceil((sortedRelatedKeywords?.length || 0) / ITEMS_PER_PAGE);
  const relatedStartIndex = (relatedCurrentPage - 1) * ITEMS_PER_PAGE;
  const relatedEndIndex = relatedStartIndex + ITEMS_PER_PAGE;
  const paginatedRelatedKeywords = sortedRelatedKeywords?.slice(relatedStartIndex, relatedEndIndex);

  // Pagination for autocomplete keywords
  const autocompleteTotalPages = Math.ceil((sortedAutocompleteKeywords?.length || 0) / ITEMS_PER_PAGE);
  const autocompleteStartIndex = (autocompleteCurrentPage - 1) * ITEMS_PER_PAGE;
  const autocompleteEndIndex = autocompleteStartIndex + ITEMS_PER_PAGE;
  const paginatedAutocompleteKeywords = sortedAutocompleteKeywords?.slice(autocompleteStartIndex, autocompleteEndIndex);

  const downloadExcel = () => {
    if (!keywordData) return;

    const relatedData = sortedRelatedKeywords?.map((item, index) => [
      index + 1,
      item.keyword,
      item.searchKeyword,
      item.monthlyPcSearchCount,
      item.monthlyMobileSearchCount,
      item.totalSearchCount,
      item.totalAvgClick,
      `${item.avgCtr.toFixed(2)}%`,
      item.competition,
      item.competitionScore,
      item.plAvgDepth
    ]) || [];

    const autocompleteData = sortedAutocompleteKeywords?.map((item, index) => [
      index + 1,
      item.keyword,
      item.searchVolume,
      item.competition,
      item.competitionScore,
      item.trend,
      item.cpc
    ]) || [];

    const csvContent = [
      ["=== 연관키워드 ==="],
      ["순번", "키워드", "검색키워드", "월간PC검색수", "월간모바일검색수", "월간전체검색수", "월평균클릭수", "월평균클릭률", "경쟁정도", "경쟁점수", "월평균노출광고수"],
      ...relatedData,
      [""],
      ["=== 자동완성 키워드 ==="],
      ["순번", "키워드", "검색량", "경쟁도", "경쟁점수", "트렌드", "CPC"],
      ...autocompleteData
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `키워드분석_${keywordData.searchKeywords?.join('_') || 'keywords'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "다운로드 완료",
      description: "키워드 분석 결과가 Excel 파일로 다운로드되었습니다.",
    });
  };

  return (
    <div className="space-y-6">
      {/* 검색 영역 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="키워드를 입력하세요 (쉼표로 구분, 최대 5개)"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && extractKeywords()}
            className="h-12 text-lg"
          />
          <p className="text-sm text-gray-500 mt-1">
            예: 스마트폰, 아이폰, 갤럭시 (최대 5개까지)
          </p>
        </div>
        <Button 
          onClick={extractKeywords} 
          disabled={loading}
          className="h-12 px-8 bg-purple-600 hover:bg-purple-700"
        >
          <Search className="h-4 w-4 mr-2" />
          {loading ? "분석중..." : "키워드 추출"}
        </Button>
      </div>

      {/* 결과 요약 */}
      {keywordData && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-sm text-gray-600">
                  분석 키워드: <span className="font-medium">{keywordData.searchKeywords?.join(', ')}</span>
                </div>
                <div className="text-sm text-gray-600">
                  연관키워드: {keywordData.relatedKeywords?.length || 0}개 | 
                  자동완성 키워드: {keywordData.autocompleteKeywords?.length || 0}개
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={restoreOriginalOrder} variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  순서복원
                </Button>
                <Button onClick={downloadExcel} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  엑셀다운로드
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 키워드 탭 */}
      {keywordData && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="related">연관키워드 ({keywordData.relatedKeywords?.length || 0})</TabsTrigger>
            <TabsTrigger value="autocomplete">자동완성키워드 ({keywordData.autocompleteKeywords?.length || 0})</TabsTrigger>
          </TabsList>

          {/* 연관키워드 탭 */}
          <TabsContent value="related">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-blue-600">
                  연관키워드 (네이버 검색광고 API)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-blue-100 min-w-40"
                          onClick={() => handleRelatedSort('keyword')}
                        >
                          <div className="flex items-center gap-1">
                            연관키워드
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-blue-100 min-w-32"
                          onClick={() => handleRelatedSort('searchKeyword')}
                        >
                          <div className="flex items-center gap-1">
                            검색키워드
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-blue-100 text-center w-32"
                          onClick={() => handleRelatedSort('totalSearchCount')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            월간검색수
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-blue-100 text-center w-28"
                          onClick={() => handleRelatedSort('totalAvgClick')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            월평균클릭수
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-blue-100 text-center w-28"
                          onClick={() => handleRelatedSort('avgCtr')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            월평균클릭률
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-blue-100 text-center w-20"
                          onClick={() => handleRelatedSort('competition')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            경쟁정도
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-blue-100 text-center w-28"
                          onClick={() => handleRelatedSort('plAvgDepth')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            월평균노출광고수
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRelatedKeywords?.map((item, index) => (
                        <TableRow key={`${item.keyword}-${index}`} className="hover:bg-blue-50">
                          <TableCell className="text-center font-medium">
                            {relatedStartIndex + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <button
                              onClick={() => handleKeywordClick(item)}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                            >
                              {item.keyword}
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {item.searchKeyword}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <Monitor className="h-3 w-3 text-blue-500" />
                                <span className="text-blue-600 font-semibold">
                                  {item.monthlyPcSearchCount?.toLocaleString() || '-'}
                                </span>
                              </div>
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <Smartphone className="h-3 w-3 text-green-500" />
                                <span className="text-green-600 font-semibold">
                                  {item.monthlyMobileSearchCount?.toLocaleString() || '-'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 border-t pt-1">
                                전체: {item.totalSearchCount?.toLocaleString() || '-'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.totalAvgClick?.toLocaleString() || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.avgCtr ? `${item.avgCtr.toFixed(2)}%` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={item.competition === '높음' ? 'destructive' : 
                                      item.competition === '중간' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {item.competition}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.plAvgDepth || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* 연관키워드 페이지네이션 */}
                {relatedTotalPages > 1 && (
                  <div className="p-4 border-t">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setRelatedCurrentPage(Math.max(1, relatedCurrentPage - 1))}
                            className={relatedCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, relatedTotalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(relatedTotalPages - 4, relatedCurrentPage - 2)) + i;
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setRelatedCurrentPage(pageNum)}
                                isActive={pageNum === relatedCurrentPage}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setRelatedCurrentPage(Math.min(relatedTotalPages, relatedCurrentPage + 1))}
                            className={relatedCurrentPage === relatedTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 자동완성키워드 탭 */}
          <TabsContent value="autocomplete">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-green-600">
                  자동완성키워드
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-green-100 min-w-40"
                          onClick={() => handleAutocompleteSort('keyword')}
                        >
                          <div className="flex items-center gap-1">
                            키워드
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-green-100 text-center w-24"
                          onClick={() => handleAutocompleteSort('searchVolume')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            검색량
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-green-100 text-center w-20"
                          onClick={() => handleAutocompleteSort('competition')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            경쟁도
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-green-100 text-center w-20"
                          onClick={() => handleAutocompleteSort('competitionScore')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            경쟁점수
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-green-100 text-center w-16"
                          onClick={() => handleAutocompleteSort('trend')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            트렌드
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-green-100 text-center w-20"
                          onClick={() => handleAutocompleteSort('cpc')}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            CPC
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAutocompleteKeywords?.map((item, index) => (
                        <TableRow key={index} className="hover:bg-green-50">
                          <TableCell className="text-center font-medium">
                            {autocompleteStartIndex + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.keyword}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-green-600">
                            {item.searchVolume?.toLocaleString() || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={item.competition === '높음' ? 'destructive' : 
                                      item.competition === '중간' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {item.competition}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.competitionScore || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={item.trend === '상승' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {item.trend}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.cpc ? `${item.cpc.toLocaleString()}원` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* 자동완성키워드 페이지네이션 */}
                {autocompleteTotalPages > 1 && (
                  <div className="p-4 border-t">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setAutocompleteCurrentPage(Math.max(1, autocompleteCurrentPage - 1))}
                            className={autocompleteCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, autocompleteTotalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(autocompleteTotalPages - 4, autocompleteCurrentPage - 2)) + i;
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setAutocompleteCurrentPage(pageNum)}
                                isActive={pageNum === autocompleteCurrentPage}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setAutocompleteCurrentPage(Math.min(autocompleteTotalPages, autocompleteCurrentPage + 1))}
                            className={autocompleteCurrentPage === autocompleteTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 키워드 상세 모달 */}
      <KeywordDetailModal
        keyword={selectedKeyword}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">키워드를 분석하고 있습니다...</p>
        </div>
      )}

      {!loading && !keywordData && keywordInput && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">분석 결과가 없습니다.</p>
          <p className="text-gray-400">다른 키워드로 시도해보세요.</p>
        </div>
      )}
    </div>
  );
};

export default KeywordExtraction;
