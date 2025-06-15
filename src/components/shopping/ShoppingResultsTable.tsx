
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ExternalLink, Star } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingItem, SortField } from "@/types/shopping";
import { formatPrice } from "@/utils/shoppingUtils";

interface ShoppingResultsTableProps {
  results: ShoppingItem[];
  currentPage: number;
  itemsPerPage: number;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
}

const ShoppingResultsTable = ({ 
  results, 
  currentPage, 
  itemsPerPage, 
  sortField, 
  sortDirection, 
  onSort 
}: ShoppingResultsTableProps) => {
  return (
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
                      onClick={() => onSort('title')}
                    >
                      <div className="flex items-center gap-1">
                        상품명
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-24 text-center cursor-pointer hover:bg-gray-100"
                      onClick={() => onSort('original')}
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
                      onClick={() => onSort('mallName')}
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
                      onClick={() => onSort('brand')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        브랜드
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-16 text-center cursor-pointer hover:bg-gray-100"
                      onClick={() => onSort('maker')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        제조사
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-20 text-center cursor-pointer hover:bg-gray-100"
                      onClick={() => onSort('lprice')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        가격
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-20 text-center cursor-pointer hover:bg-gray-100"
                      onClick={() => onSort('reviewCount')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        리뷰수
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-20 text-center cursor-pointer hover:bg-gray-100"
                      onClick={() => onSort('integrationScore')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        통합점수
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-16 text-center cursor-pointer hover:bg-gray-100"
                      onClick={() => onSort('clickCount')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        클릭수
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-16 text-center cursor-pointer hover:bg-gray-100"
                      onClick={() => onSort('integrationRank')}
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
                      onClick={() => onSort('registeredAt')}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        등록일시
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((item, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
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
  );
};

export default ShoppingResultsTable;
