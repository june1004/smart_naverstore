
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RelatedKeyword {
  relKeyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  totalSearchVolume: number;
  plAvgDepth: number;
  compIdx: string;
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
}

type RelatedSortField = 'relKeyword' | 'totalSearchVolume' | 'monthlyPcQcCnt' | 'monthlyMobileQcCnt' | 'plAvgDepth' | 'compIdx';
type AutocompleteSortField = 'keyword' | 'searchVolume' | 'competition' | 'competitionScore' | 'trend' | 'cpc';

const KeywordExtraction = () => {
  const [keyword, setKeyword] = useState("");
  const [keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [relatedSortField, setRelatedSortField] = useState<RelatedSortField>('totalSearchVolume');
  const [relatedSortDirection, setRelatedSortDirection] = useState<'asc' | 'desc'>('desc');
  const [autocompleteSortField, setAutocompleteSortField] = useState<AutocompleteSortField>('searchVolume');
  const [autocompleteSortDirection, setAutocompleteSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const extractKeywords = async () => {
    if (!keyword.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "추출할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('naver-keyword-extraction', {
        body: { keyword: keyword.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      setKeywordData(data);
      
      toast({
        title: "키워드 추출 완료",
        description: `'${keyword}' 키워드 분석이 완료되었습니다.`,
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

  const handleRelatedSort = (field: RelatedSortField) => {
    if (relatedSortField === field) {
      setRelatedSortDirection(relatedSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRelatedSortField(field);
      setRelatedSortDirection('desc');
    }
  };

  const handleAutocompleteSort = (field: AutocompleteSortField) => {
    if (autocompleteSortField === field) {
      setAutocompleteSortDirection(autocompleteSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAutocompleteSortField(field);
      setAutocompleteSortDirection('desc');
    }
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

  const downloadExcel = () => {
    if (!keywordData) return;

    const relatedData = sortedRelatedKeywords?.map((item, index) => [
      index + 1,
      item.relKeyword,
      item.monthlyPcQcCnt,
      item.monthlyMobileQcCnt,
      item.totalSearchVolume,
      item.plAvgDepth,
      item.compIdx
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
      ["=== 통합연관 키워드 ==="],
      ["순번", "키워드", "PC 검색수", "모바일 검색수", "총 검색량", "평균 깊이", "경쟁지수"],
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
    link.setAttribute("download", `${keyword}_키워드분석.csv`);
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
            placeholder="키워드를 입력하세요 (예: 스마트폰, 화장품, 운동화 등)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && extractKeywords()}
            className="h-12 text-lg"
          />
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
                  분석 키워드: <span className="font-medium">{keyword}</span>
                </div>
                <div className="text-sm text-gray-600">
                  통합연관 키워드: {keywordData.relatedKeywords?.length || 0}개 | 
                  자동완성 키워드: {keywordData.autocompleteKeywords?.length || 0}개
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

      {/* 통합연관 키워드 테이블 */}
      {sortedRelatedKeywords && sortedRelatedKeywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-600">
              통합연관 키워드 ({sortedRelatedKeywords.length}개)
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
                      onClick={() => handleRelatedSort('relKeyword')}
                    >
                      <div className="flex items-center gap-1">
                        키워드
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-blue-100 text-center w-24"
                      onClick={() => handleRelatedSort('monthlyPcQcCnt')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        PC검색수
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-blue-100 text-center w-24"
                      onClick={() => handleRelatedSort('monthlyMobileQcCnt')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        모바일검색수
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-blue-100 text-center w-24"
                      onClick={() => handleRelatedSort('totalSearchVolume')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        총검색량
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-blue-100 text-center w-20"
                      onClick={() => handleRelatedSort('plAvgDepth')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        평균깊이
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-blue-100 text-center w-20"
                      onClick={() => handleRelatedSort('compIdx')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        경쟁지수
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRelatedKeywords.map((item, index) => (
                    <TableRow key={index} className="hover:bg-blue-50">
                      <TableCell className="text-center font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.relKeyword}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.monthlyPcQcCnt?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.monthlyMobileQcCnt?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-blue-600">
                        {item.totalSearchVolume?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.plAvgDepth || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {item.compIdx || '-'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 자동완성 키워드 테이블 */}
      {sortedAutocompleteKeywords && sortedAutocompleteKeywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-green-600">
              자동완성 키워드 ({sortedAutocompleteKeywords.length}개)
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
                  {sortedAutocompleteKeywords.map((item, index) => (
                    <TableRow key={index} className="hover:bg-green-50">
                      <TableCell className="text-center font-medium">
                        {index + 1}
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
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">키워드를 분석하고 있습니다...</p>
        </div>
      )}

      {!loading && !keywordData && keyword && (
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
