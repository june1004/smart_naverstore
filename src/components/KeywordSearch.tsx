
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
}

const KeywordSearch = () => {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
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
          display: 30,
          start: 1,
          sort: 'sim'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setResults(data.items || []);
      toast({
        title: "검색 완료",
        description: `'${keyword}' 검색 결과 ${data.items?.length || 0}개를 찾았습니다.`,
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

  const downloadExcel = () => {
    const csvContent = [
      ["등록일시", "순번", "이미지", "상품명", "업체명", "가격", "카테고리", "브랜드", "제조사", "총합점수", "판매건수", "리뷰", "리뷰점수", "인기도", "종합점수", "최신성", "감색어", "적합도", "신뢰성"],
      ...results.map((item, index) => [
        getCurrentDateTime(),
        index + 1,
        item.image,
        item.title.replace(/<[^>]*>/g, ''),
        item.mallName,
        item.lprice,
        `${item.category1} > ${item.category2} > ${item.category3}`,
        item.brand,
        item.maker,
        Math.floor(Math.random() * 1000) + 500, // 총합점수 (임시값)
        Math.floor(Math.random() * 10), // 판매건수 (임시값)
        Math.floor(Math.random() * 5), // 리뷰 (임시값)
        Math.floor(Math.random() * 5), // 리뷰점수 (임시값)
        Math.floor(Math.random() * 5), // 인기도 (임시값)
        Math.floor(Math.random() * 5), // 종합점수 (임시값)
        Math.floor(Math.random() * 5), // 최신성 (임시값)
        Math.floor(Math.random() * 5), // 감색어 (임시값)
        Math.floor(Math.random() * 5), // 적합도 (임시값)
        "GOOD" // 신뢰성
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${keyword}_쇼핑검색결과.csv`);
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

  // 랜덤 점수 생성 함수
  const generateRandomScore = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
          display: 30,
          start: 1,
          sort: 'sim'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setResults(data.items || []);
      toast({
        title: "검색 완료",
        description: `'${keyword}' 검색 결과 ${data.items?.length || 0}개를 찾았습니다.`,
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

      {/* 검색 정보 헤더 */}
      {results.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="space-y-1">
                <div className="text-sm text-gray-600">
                  키워드: <span className="font-medium">{keyword}</span>
                </div>
                <div className="text-sm text-gray-600">
                  마지막 조회: {getCurrentDateTime()}
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

      {/* 검색 결과 테이블 */}
      {results.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-20 text-center">등록일시</TableHead>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-20 text-center">이미지</TableHead>
                    <TableHead className="min-w-60">상품명</TableHead>
                    <TableHead className="w-24 text-center">업체명</TableHead>
                    <TableHead className="w-20 text-center">가격</TableHead>
                    <TableHead className="w-16 text-center">총합점수</TableHead>
                    <TableHead className="w-16 text-center">판매건수</TableHead>
                    <TableHead className="w-16 text-center">리뷰</TableHead>
                    <TableHead className="w-16 text-center">리뷰점수</TableHead>
                    <TableHead className="w-16 text-center">인기도</TableHead>
                    <TableHead className="w-16 text-center">종합점수</TableHead>
                    <TableHead className="w-16 text-center">최신성</TableHead>
                    <TableHead className="w-16 text-center">감색어</TableHead>
                    <TableHead className="w-16 text-center">적합도</TableHead>
                    <TableHead className="w-16 text-center">신뢰성</TableHead>
                    <TableHead className="w-16 text-center">링크</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="text-center text-xs">
                        {getCurrentDateTime()}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center">
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
                      <TableCell>
                        <div 
                          className="cursor-pointer hover:text-blue-600 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: item.title }}
                          onClick={() => window.open(item.link, '_blank')}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {item.mallName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium text-red-600">
                        {formatPrice(item.lprice)}원
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">
                        {generateRandomScore(500, 2000)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {generateRandomScore(0, 10)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {generateRandomScore(0, 5)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {generateRandomScore(1, 5)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {generateRandomScore(1, 5)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {generateRandomScore(1, 5)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {generateRandomScore(0, 2)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {generateRandomScore(0, 2)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {generateRandomScore(1, 5)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <Badge variant="secondary" className="text-xs">
                          GOOD
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">검색 중입니다...</p>
        </div>
      )}

      {/* 검색 결과 없음 */}
      {!loading && results.length === 0 && keyword && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">검색 결과가 없습니다.</p>
          <p className="text-gray-400">다른 키워드로 검색해보세요.</p>
        </div>
      )}
    </div>
  );
};

export default KeywordSearch;
