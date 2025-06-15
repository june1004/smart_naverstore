
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, ArrowUpDown, Hash } from "lucide-react";
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
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AutocompleteKeyword {
  keyword: string;
  monthlyPcSearchCount?: number;
  monthlyMobileSearchCount?: number;
  totalSearchCount?: number;
  monthlyAvgPcClick?: number;
  monthlyAvgMobileClick?: number;
  totalAvgClick?: number;
  competition?: string;
  competitionScore?: number;
  trend?: string;
  cpc?: number;
}

type AutocompleteSortField = 'keyword' | 'totalSearchCount' | 'totalAvgClick' | 'monthlyPcSearchCount' | 'monthlyMobileSearchCount' | 'monthlyAvgPcClick' | 'monthlyAvgMobileClick';

interface Props {
  autocompleteKeywordsByKeyword: { [key: string]: AutocompleteKeyword[] };
  searchKeywords: string[];
  searchPeriod?: string;
}

const ITEMS_PER_PAGE = 20;

const AutocompleteKeywordTable = ({ autocompleteKeywordsByKeyword, searchKeywords, searchPeriod }: Props) => {
  const [autocompleteCurrentPage, setAutocompleteCurrentPage] = useState(1);
  const [autocompleteSortField, setAutocompleteSortField] = useState<AutocompleteSortField>('totalAvgClick');
  const [autocompleteSortDirection, setAutocompleteSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleAutocompleteSort = (field: AutocompleteSortField) => {
    if (autocompleteSortField === field) {
      setAutocompleteSortDirection(autocompleteSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAutocompleteSortField(field);
      setAutocompleteSortDirection('desc');
    }
    setAutocompleteCurrentPage(1);
  };

  if (searchKeywords && searchKeywords.length > 1) {
    // 멀티키워드인 경우 - 블럭 형태로 표시
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {searchKeywords.slice(0, 5).map((keyword) => {
          const autocompleteKeywords = autocompleteKeywordsByKeyword?.[keyword] || [];
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
                              <span>PC검색</span>
                            </div>
                            <span className="font-semibold">
                              {item.monthlyPcSearchCount?.toLocaleString() || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-green-600">
                              <Smartphone className="h-3 w-3" />
                              <span>모바일검색</span>
                            </div>
                            <span className="font-semibold">
                              {item.monthlyMobileSearchCount?.toLocaleString() || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs border-t pt-1">
                            <span className="text-gray-600">전체검색</span>
                            <span className="font-bold text-purple-600">
                              {((item.monthlyPcSearchCount || 0) + (item.monthlyMobileSearchCount || 0)).toLocaleString() || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-blue-600">
                              <Monitor className="h-3 w-3" />
                              <span>PC클릭</span>
                            </div>
                            <span className="font-semibold">
                              {item.monthlyAvgPcClick?.toLocaleString() || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-green-600">
                              <Smartphone className="h-3 w-3" />
                              <span>모바일클릭</span>
                            </div>
                            <span className="font-semibold">
                              {item.monthlyAvgMobileClick?.toLocaleString() || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs border-t pt-1">
                            <span className="text-gray-600">전체클릭</span>
                            <span className="font-bold text-red-600">
                              {((item.monthlyAvgPcClick || 0) + (item.monthlyAvgMobileClick || 0)).toLocaleString() || '-'}
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
    );
  }

  // 단일키워드인 경우 - 테이블 형태로 표시
  if (searchKeywords && searchKeywords.length === 1) {
    const currentAutocompleteKeywords = autocompleteKeywordsByKeyword?.[searchKeywords[0]] || [];
    const sortedAutocompleteKeywords = [...currentAutocompleteKeywords].sort((a, b) => {
      const aValue = a[autocompleteSortField];
      const bValue = b[autocompleteSortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return autocompleteSortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      const aNum = typeof aValue === 'number' ? aValue : (aValue || 0);
      const bNum = typeof bValue === 'number' ? bValue : (bValue || 0);
      
      return autocompleteSortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
    
    // Pagination for autocomplete keywords
    const autocompleteTotalPages = Math.ceil(sortedAutocompleteKeywords.length / ITEMS_PER_PAGE);
    const autocompleteStartIndex = (autocompleteCurrentPage - 1) * ITEMS_PER_PAGE;
    const autocompleteEndIndex = autocompleteStartIndex + ITEMS_PER_PAGE;
    const paginatedAutocompleteKeywords = sortedAutocompleteKeywords.slice(autocompleteStartIndex, autocompleteEndIndex);

    return (
      <div>
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-700">
              "{searchKeywords[0]}"의 자동완성 키워드
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">정렬:</span>
            <Select value={autocompleteSortField} onValueChange={(value) => setAutocompleteSortField(value as AutocompleteSortField)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">키워드명</SelectItem>
                <SelectItem value="totalSearchCount">전체검색수</SelectItem>
                <SelectItem value="totalAvgClick">전체클릭수</SelectItem>
                <SelectItem value="monthlyPcSearchCount">PC검색수</SelectItem>
                <SelectItem value="monthlyMobileSearchCount">모바일검색수</SelectItem>
                <SelectItem value="monthlyAvgPcClick">PC클릭수</SelectItem>
                <SelectItem value="monthlyAvgMobileClick">모바일클릭수</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
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
                    자동완성키워드
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-green-100 text-center w-32"
                  onClick={() => handleAutocompleteSort('totalSearchCount')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    월간검색수
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-green-100 text-center w-28"
                  onClick={() => handleAutocompleteSort('totalAvgClick')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    월평균클릭수
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAutocompleteKeywords.map((item, index) => (
                <TableRow key={`${item.keyword}-${index}`} className="hover:bg-green-50">
                  <TableCell className="text-center font-medium">
                    {autocompleteStartIndex + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.keyword}
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
                        전체: {((item.monthlyPcSearchCount || 0) + (item.monthlyMobileSearchCount || 0)).toLocaleString() || '-'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Monitor className="h-3 w-3 text-blue-500" />
                        <span className="text-blue-600 font-semibold">
                          {item.monthlyAvgPcClick?.toLocaleString() || '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Smartphone className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 font-semibold">
                          {item.monthlyAvgMobileClick?.toLocaleString() || '-'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 border-t pt-1">
                        전체: {((item.monthlyAvgPcClick || 0) + (item.monthlyAvgMobileClick || 0)).toLocaleString() || '-'}
                      </div>
                    </div>
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
      </div>
    );
  }

  return null;
};

export default AutocompleteKeywordTable;
