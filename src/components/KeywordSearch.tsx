
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, ExternalLink } from "lucide-react";

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
      // 네이버 쇼핑 검색 API 호출 시뮬레이션
      // 실제 구현시 백엔드 API를 통해 호출해야 합니다
      const mockData: ShoppingItem[] = [
        {
          title: "1등급지 육성지진 10kg 신선한 충남부경",
          link: "https://example.com/product1",
          image: "/placeholder.svg",
          lprice: "45900",
          hprice: "50000",
          mallName: "식품-김치-육성지",
          productId: "1",
          productType: "일반상품",
          brand: "충남부경",
          maker: "충남부경",
          category1: "식품",
          category2: "김치",
          category3: "육성지",
          category4: ""
        },
        {
          title: "무진식품 국산 전라도 특품지 육성지진 2kg",
          link: "https://example.com/product2",
          image: "/placeholder.svg",
          lprice: "19500",
          hprice: "25000",
          mallName: "무진식품",
          productId: "2",
          productType: "일반상품",
          brand: "무진식품",
          maker: "무진식품",
          category1: "식품",
          category2: "김치",
          category3: "육성지",
          category4: ""
        }
      ];

      setTimeout(() => {
        setResults(mockData);
        setLoading(false);
        toast({
          title: "검색 완료",
          description: `'${keyword}' 검색 결과 ${mockData.length}개를 찾았습니다.`,
        });
      }, 1000);

    } catch (error) {
      setLoading(false);
      toast({
        title: "검색 실패",
        description: "검색 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const downloadExcel = () => {
    // Excel 다운로드 로직 구현
    const csvContent = [
      ["상품명", "업체명", "최저가", "최고가", "카테고리", "브랜드"],
      ...results.map(item => [
        item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
        item.mallName,
        item.lprice,
        item.hprice,
        `${item.category1} > ${item.category2} > ${item.category3}`,
        item.brand
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

      {/* 결과 헤더 */}
      {results.length > 0 && (
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">
            검색 결과: <span className="text-blue-600">{results.length}개</span>
          </div>
          <Button onClick={downloadExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            엑셀 다운로드
          </Button>
        </div>
      )}

      {/* 검색 결과 */}
      <div className="grid gap-4">
        {results.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                  <img 
                    src={item.image} 
                    alt="상품 이미지" 
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 
                      className="font-semibold text-lg line-clamp-2 cursor-pointer hover:text-blue-600"
                      dangerouslySetInnerHTML={{ __html: item.title }}
                    />
                    <ExternalLink className="h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-600" />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{item.mallName}</Badge>
                    <span className="text-sm text-gray-600">브랜드: {item.brand}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-bold text-red-600">
                        {parseInt(item.lprice).toLocaleString()}원
                      </div>
                      {item.hprice !== item.lprice && (
                        <div className="text-sm text-gray-500 line-through">
                          {parseInt(item.hprice).toLocaleString()}원
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.category1} {"> "} {item.category2} {"> "} {item.category3}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
