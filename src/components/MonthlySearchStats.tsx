
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MonthlyStats {
  keyword: string;
  registrationTime: string;
  rank: number;
  image: string;
  productName: string;
  company: string;
  searchVolume: number;
  clicks: number;
  clickRate: number;
  cpc: number;
  cost: number;
}

const MonthlySearchStats = () => {
  const [keyword, setKeyword] = useState("");
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateMonthlyStats = async () => {
    if (!keyword.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "월간 통계를 생성할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // 저장된 쇼핑 검색 결과에서 데이터 가져오기
      const savedSearchHistory = localStorage.getItem('shoppingSearchHistory');
      let baseData = [];
      
      if (savedSearchHistory) {
        const parsedHistory = JSON.parse(savedSearchHistory);
        if (parsedHistory.keyword === keyword.trim()) {
          baseData = parsedHistory.results.slice(0, 10);
        }
      }

      // 기본 데이터가 없으면 샘플 데이터 생성
      if (baseData.length === 0) {
        baseData = Array.from({ length: 10 }, (_, index) => ({
          title: `${keyword} 관련 상품 ${index + 1}`,
          image: "/placeholder.svg",
          mallName: `쇼핑몰${index + 1}`,
        }));
      }

      const mockStats: MonthlyStats[] = baseData.map((item, index) => ({
        keyword: keyword.trim(),
        registrationTime: getCurrentDateTime(),
        rank: index + 1,
        image: item.image || "/placeholder.svg",
        productName: item.title?.replace(/<[^>]*>/g, '') || `${keyword} 상품 ${index + 1}`,
        company: item.mallName || `업체${index + 1}`,
        searchVolume: Math.floor(Math.random() * 50000) + 10000,
        clicks: Math.floor(Math.random() * 5000) + 500,
        clickRate: parseFloat((Math.random() * 10 + 2).toFixed(2)),
        cpc: Math.floor(Math.random() * 500) + 100,
        cost: Math.floor(Math.random() * 100000) + 20000,
      }));

      setMonthlyData(mockStats);
      
      // 검색 결과 저장
      localStorage.setItem('monthlyStatsHistory', JSON.stringify({
        keyword: keyword.trim(),
        searchTime: getCurrentDateTime(),
        data: mockStats
      }));

      toast({
        title: "월간 통계 생성 완료",
        description: `'${keyword}' 키워드의 월간 검색 통계 ${mockStats.length}개를 생성했습니다.`,
      });

    } catch (error) {
      console.error('월간 통계 생성 오류:', error);
      toast({
        title: "통계 생성 실패",
        description: "월간 통계 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!monthlyData.length) return;

    const csvContent = [
      ["키워드", "등록일시", "순위", "이미지", "상품명", "업체명", "월간검색수", "클릭수", "클릭률(%)", "CPC", "비용"],
      ...monthlyData.map(item => [
        item.keyword,
        item.registrationTime,
        item.rank,
        item.image,
        item.productName,
        item.company,
        item.searchVolume.toLocaleString(),
        item.clicks.toLocaleString(),
        item.clickRate,
        item.cpc.toLocaleString(),
        item.cost.toLocaleString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${keyword}_월간검색통계.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "다운로드 완료",
      description: "월간 검색 통계가 Excel 파일로 다운로드되었습니다.",
    });
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  };

  // 컴포넌트 마운트 시 저장된 데이터 복원
  useState(() => {
    const savedHistory = localStorage.getItem('monthlyStatsHistory');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      setKeyword(parsedHistory.keyword);
      setMonthlyData(parsedHistory.data);
    }
  });

  return (
    <div className="space-y-6">
      {/* 검색 영역 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="월간 통계를 생성할 키워드를 입력하세요"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && generateMonthlyStats()}
            className="h-12 text-lg"
          />
        </div>
        <Button 
          onClick={generateMonthlyStats} 
          disabled={loading}
          className="h-12 px-8 bg-green-600 hover:bg-green-700"
        >
          <Search className="h-4 w-4 mr-2" />
          {loading ? "생성중..." : "통계 생성"}
        </Button>
      </div>

      {monthlyData.length > 0 && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">
                    키워드: <span className="font-medium">{keyword}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    총 검색결과: {monthlyData.length}개
                  </div>
                </div>
                <Button onClick={downloadExcel} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  엑셀다운로드
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>월간 검색 통계</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-20 text-center">순위</TableHead>
                        <TableHead className="w-20 text-center">이미지</TableHead>
                        <TableHead className="min-w-60">상품명</TableHead>
                        <TableHead className="w-24 text-center">업체명</TableHead>
                        <TableHead className="w-24 text-center">월간검색수</TableHead>
                        <TableHead className="w-20 text-center">클릭수</TableHead>
                        <TableHead className="w-20 text-center">클릭률(%)</TableHead>
                        <TableHead className="w-20 text-center">CPC</TableHead>
                        <TableHead className="w-20 text-center">비용</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.map((item, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="text-center font-medium">
                            {item.rank}
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
                          <TableCell className="font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {item.company}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium text-blue-600">
                            {item.searchVolume.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-medium text-green-600">
                            {item.clicks.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-medium text-purple-600">
                            {item.clickRate}%
                          </TableCell>
                          <TableCell className="text-center font-medium text-orange-600">
                            {item.cpc.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-center font-medium text-red-600">
                            {item.cost.toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">월간 통계를 생성하고 있습니다...</p>
        </div>
      )}

      {!loading && monthlyData.length === 0 && keyword && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">월간 통계를 생성해주세요.</p>
          <p className="text-gray-400">키워드를 입력하고 통계 생성 버튼을 클릭하세요.</p>
        </div>
      )}
    </div>
  );
};

export default MonthlySearchStats;
