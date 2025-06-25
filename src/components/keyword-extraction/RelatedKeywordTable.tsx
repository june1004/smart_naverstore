import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, ArrowUpDown, Plus, Filter } from "lucide-react";
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

type RelatedSortField = 'keyword' | 'searchKeyword' | 'totalSearchCount' | 'totalAvgClick' | 'avgCtr' | 'competition' | 'competitionScore' | 'plAvgDepth' | 'originalIndex';

interface Props {
  relatedKeywords: RelatedKeyword[];
  onKeywordClick: (keyword: RelatedKeyword) => void;
  onSearchRelatedKeyword: (keyword: string) => void;
  loading: boolean;
  addedAutocompleteKeywords?: string[];
  onAddAutocompleteKeyword?: (keyword: string) => void;
}

const ITEMS_PER_PAGE = 20;

const RelatedKeywordTable = ({ relatedKeywords, onKeywordClick, onSearchRelatedKeyword, loading, addedAutocompleteKeywords, onAddAutocompleteKeyword }: Props) => {
  const [relatedSortField, setRelatedSortField] = useState<RelatedSortField>('originalIndex');
  const [relatedSortDirection, setRelatedSortDirection] = useState<'asc' | 'desc'>('asc');
  const [relatedCurrentPage, setRelatedCurrentPage] = useState(1);
  const [relatedSearchQuery, setRelatedSearchQuery] = useState("");

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
  const filteredAndSortedRelatedKeywords = relatedKeywords
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold text-blue-600">
          연관키워드 (네이버 검색광고 API)
        </div>
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
                    onClick={() => onKeywordClick(item)}
                    className="text-blue-700 hover:underline"
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
                  {onAddAutocompleteKeyword && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={addedAutocompleteKeywords?.includes(item.keyword)}
                      onClick={() => onAddAutocompleteKeyword(item.keyword)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      자동완성추가
                    </Button>
                  )}
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
    </div>
  );
};

export default RelatedKeywordTable;
