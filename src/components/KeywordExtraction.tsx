import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, ArrowUpDown, RotateCcw, Hash, Monitor, Smartphone, Plus, Filter, User } from "lucide-react";
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
import { useKeyword } from "@/contexts/KeywordContext";
import { useAuth } from "@/contexts/AuthContext";

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
  monthlyPcSearchCount?: number;
  monthlyMobileSearchCount?: number;
  totalSearchCount?: number;
}

interface KeywordData {
  relatedKeywords: RelatedKeyword[];
  autocompleteKeywordsByKeyword: { [key: string]: AutocompleteKeyword[] };
  searchKeywords: string[];
  searchPeriod?: string;
  debug?: {
    isMultiKeyword: boolean;
  };
}

type RelatedSortField = 'keyword' | 'searchKeyword' | 'totalSearchCount' | 'totalAvgClick' | 'avgCtr' | 'competition' | 'competitionScore' | 'plAvgDepth' | 'originalIndex';

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
  const [relatedSearchQuery, setRelatedSearchQuery] = useState("");
  
  // Autocomplete keywords state
  const [autocompleteActiveTab, setAutocompleteActiveTab] = useState("");
  const [autocompleteCurrentPage, setAutocompleteCurrentPage] = useState(1);
  
  // Modal state
  const [selectedKeyword, setSelectedKeyword] = useState<RelatedKeyword | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { toast } = useToast();
  const { sharedKeyword } = useKeyword();
  const { user } = useAuth();

  // 공유된 키워드로 초기화
  useEffect(() => {
    if (sharedKeyword && !keywordInput) {
      setKeywordInput(sharedKeyword);
    }
  }, [sharedKeyword, keywordInput]);

  // 인증되지 않은 사용자 체크
  useEffect(() => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "키워드 추출 기능을 사용하려면 로그인해주세요.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const extractKeywords = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "회원가입 또는 로그인 후 이용해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!keywordInput.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "추출할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

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
      setOriginalKeywordData(data);
      setRelatedCurrentPage(1);
      setAutocompleteCurrentPage(1);
      setRelatedSortField('originalIndex');
      setRelatedSortDirection('asc');
      
      if (keywords.length > 0) {
        setAutocompleteActiveTab(keywords[0]);
      }
      
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

  const searchRelatedKeyword = async (keyword: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('naver-searchad-keywords', {
        body: { keywords: [keyword] }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (keywordData && data.relatedKeywords) {
        const updatedData = {
          ...keywordData,
          relatedKeywords: [...keywordData.relatedKeywords, ...data.relatedKeywords],
          searchKeywords: [...keywordData.searchKeywords, keyword]
        };
        setKeywordData(updatedData);
      }
      
      toast({
        title: "연관키워드 검색 완료",
        description: `"${keyword}"의 연관키워드가 추가되었습니다.`,
      });

    } catch (error) {
      console.error('연관키워드 검색 오류:', error);
      toast({
        title: "검색 실패",
        description: "연관키워드 검색 중 오류가 발생했습니다.",
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

  // 연관키워드 필터링 및 정렬
  const filteredAndSortedRelatedKeywords = keywordData?.relatedKeywords
    ?.filter(item => 
      relatedSearchQuery === "" || 
      item.keyword.toLowerCase().includes(relatedSearchQuery.toLowerCase()) ||
      item.searchKeyword.toLowerCase().includes(relatedSearchQuery.toLowerCase())
    )
    ?.sort((a, b) => {
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

  // Pagination for related keywords
  const relatedTotalPages = Math.ceil((filteredAndSortedRelatedKeywords?.length || 0) / ITEMS_PER_PAGE);
  const relatedStartIndex = (relatedCurrentPage - 1) * ITEMS_PER_PAGE;
  const relatedEndIndex = relatedStartIndex + ITEMS_PER_PAGE;
  const paginatedRelatedKeywords = filteredAndSortedRelatedKeywords?.slice(relatedStartIndex, relatedEndIndex);

  // Autocomplete keywords by current tab
  const currentAutocompleteKeywords = keywordData?.autocompleteKeywordsByKeyword?.[autocompleteActiveTab] || [];
  
  // Pagination for autocomplete keywords
  const autocompleteTotalPages = Math.ceil(currentAutocompleteKeywords.length / ITEMS_PER_PAGE);
  const autocompleteStartIndex = (autocompleteCurrentPage - 1) * ITEMS_PER_PAGE;
  const autocompleteEndIndex = autocompleteStartIndex + ITEMS_PER_PAGE;
  const paginatedAutocompleteKeywords = currentAutocompleteKeywords.slice(autocompleteStartIndex, autocompleteEndIndex);

  const downloadExcel = () => {
    if (!keywordData) return;

    const relatedData = filteredAndSortedRelatedKeywords?.map((item, index) => [
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

    let autocompleteData = [];
    Object.keys(keywordData.autocompleteKeywordsByKeyword || {}).forEach(keyword => {
      autocompleteData.push([`=== ${keyword} 자동완성키워드 ===`]);
      autocompleteData.push(["순번", "키워드", "월간PC검색수", "월간모바일검색수", "월간전체검색수"]);
      keywordData.autocompleteKeywordsByKeyword[keyword]?.forEach((item, index) => {
        autocompleteData.push([
          index + 1,
          item.keyword,
          item.monthlyPcSearchCount || '-',
          item.monthlyMobileSearchCount || '-',
          item.totalSearchCount || '-'
        ]);
      });
      autocompleteData.push([""]);
    });

    const csvContent = [
      ["=== 연관키워드 ==="],
      ["순번", "키워드", "검색키워드", "월간PC검색수", "월간모바일검색수", "월간전체검색수", "월평균클릭수", "월평균클릭률", "경쟁정도", "경쟁점수", "월평균노출광고수"],
      ...relatedData,
      [""],
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
      {/* 로그인 안내 */}
      {!user && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <User className="h-4 w-4" />
              <span className="font-medium">로그인이 필요한 기능입니다</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              키워드 추출 기능을 사용하려면 회원가입 또는 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 검색 영역 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="키워드를 입력하세요 (쉼표로 구분, 최대 5개)"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && extractKeywords()}
            className="h-12 text-lg"
            disabled={!user}
          />
          <p className="text-sm text-gray-500 mt-1">
            {sharedKeyword ? `기본 키워드: "${sharedKeyword}" (추가 키워드 입력 가능)` : "예: 스마트폰, 아이폰, 갤럭시 (최대 5개까지)"}
          </p>
        </div>
        <Button 
          onClick={extractKeywords} 
          disabled={loading || !user}
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
                  분석 기간: <span className="font-medium">{keywordData.searchPeriod || '2025-06-12'}</span>
                </div>
                <div className="text-sm text-gray-600">
                  연관키워드: {keywordData.relatedKeywords?.length || 0}개 | 
                  자동완성 키워드: {Object.values(keywordData.autocompleteKeywordsByKeyword || {}).reduce((total, keywords) => total + keywords.length, 0)}개
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
            <TabsTrigger value="autocomplete">
              자동완성키워드 ({Object.values(keywordData.autocompleteKeywordsByKeyword || {}).reduce((total, keywords) => total + keywords.length, 0)})
            </TabsTrigger>
          </TabsList>

          {/* 연관키워드 탭 */}
          <TabsContent value="related">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-blue-600">
                    연관키워드 (네이버 검색광고 API)
                  </CardTitle>
                  <div className="flex gap-2 items-center">
                    <div className="relative">
                      <Filter className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="연관키워드 검색..."
                        value={relatedSearchQuery}
                        onChange={(e) => {
                          setRelatedSearchQuery(e.target.value);
                          setRelatedCurrentPage(1);
                        }}
                        className="pl-9 w-64"
                      />
                    </div>
                  </div>
                </div>
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
                        <TableHead className="text-center w-20">
                          액션
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
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => searchRelatedKeyword(item.keyword)}
                              className="h-7 w-7 p-0"
                              disabled={loading}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
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

          {/* 자동완성키워드 탭 - 블럭 형태로 변경 */}
          <TabsContent value="autocomplete">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-green-600">
                  자동완성키워드 비교 분석
                </CardTitle>
                <div className="text-sm text-gray-600">
                  분석기간: {keywordData.searchPeriod || '2025-06-12'}
                </div>
              </CardHeader>
              <CardContent>
                {keywordData.searchKeywords && keywordData.searchKeywords.length > 1 ? (
                  /* 멀티키워드인 경우 - 블럭 형태로 표시 */
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {keywordData.searchKeywords.slice(0, 5).map((keyword) => {
                      const autocompleteKeywords = keywordData.autocompleteKeywordsByKeyword?.[keyword] || [];
                      return (
                        <Card key={keyword} className="border-2 border-green-200 bg-green-50/30">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base text-green-700 flex items-center gap-2">
                              <Hash className="h-4 w-4" />
                              {keyword}
                              <Badge variant="secondary" className="ml-auto">
                                {autocompleteKeywords.length}개
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {autocompleteKeywords.slice(0, 10).map((item, index) => (
                                <div key={index} className="bg-white rounded-lg p-3 border border-green-100 hover:border-green-200 transition-colors">
                                  <div className="font-medium text-sm text-gray-800 mb-2">
                                    {item.keyword}
                                  </div>
                                  {item.monthlyPcSearchCount !== undefined ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1 text-blue-600">
                                          <Monitor className="h-3 w-3" />
                                          <span>PC</span>
                                        </div>
                                        <span className="font-semibold">
                                          {item.monthlyPcSearchCount?.toLocaleString() || '-'}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1 text-green-600">
                                          <Smartphone className="h-3 w-3" />
                                          <span>모바일</span>
                                        </div>
                                        <span className="font-semibold">
                                          {item.monthlyMobileSearchCount?.toLocaleString() || '-'}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs border-t pt-1">
                                        <span className="text-gray-600">전체</span>
                                        <span className="font-bold text-purple-600">
                                          {item.totalSearchCount?.toLocaleString() || '-'}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-400">검색량 정보 없음</div>
                                  )}
                                </div>
                              ))}
                              {autocompleteKeywords.length > 10 && (
                                <div className="text-center py-2">
                                  <Badge variant="outline" className="text-xs">
                                    +{autocompleteKeywords.length - 10}개 더
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  /* 단일키워드인 경우 - 상위 클릭수 연관키워드 4개 */
                  keywordData.searchKeywords && keywordData.searchKeywords.length === 1 && (
                    <div className="max-w-2xl mx-auto">
                      <Card className="border-2 border-green-200 bg-green-50/30">
                        <CardHeader>
                          <CardTitle className="text-base text-green-700 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            "{keywordData.searchKeywords[0]}"의 상위 클릭수 연관키워드
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {currentAutocompleteKeywords.map((item, index) => (
                              <div key={index} className="bg-white rounded-lg p-4 border border-green-100 hover:border-green-200 transition-colors">
                                <div className="font-medium text-gray-800 mb-1">
                                  {item.keyword}
                                </div>
                                <div className="text-sm text-gray-600">
                                  상위 클릭수 연관키워드 #{index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
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
