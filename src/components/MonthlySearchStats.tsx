
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  monthlyPcSearches: number;
  monthlyMobileSearches: number;
  totalSearches: number;
  pcClicks: number;
  mobileClicks: number;
  pcClickRate: number;
  mobileClickRate: number;
  competitionLevel: string;
  competitionScore: number;
  avgPosition: number;
  impressions: number;
  ctr: number;
  cpc: number;
}

const MonthlySearchStats = () => {
  const [keyword, setKeyword] = useState("");
  const [statsData, setStatsData] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const searchMonthlyStats = async () => {
    if (!keyword.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "검색할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // 실제 API 대신 임시 데이터 생성
      const mockData: MonthlyStats[] = Array.from({ length: 10 }, (_, index) => ({
        keyword: `${keyword} ${index + 1}`,
        monthlyPcSearches: Math.floor(Math.random() * 500000) + 10000,
        monthlyMobileSearches: Math.floor(Math.random() * 200000) + 5000,
        totalSearches: Math.floor(Math.random() * 700000) + 15000,
        pcClicks: Math.floor(Math.random() * 50000) + 1000,
        mobileClicks: Math.floor(Math.random() * 30000) + 500,
        pcClickRate: Math.random() * 10 + 0.1,
        mobileClickRate: Math.random() * 5 + 0.1,
        competitionLevel: ['높음', '중간', '낮음'][Math.floor(Math.random() * 3)],
        competitionScore: Math.floor(Math.random() * 15) + 1,
        avgPosition: Math.random() * 20 + 1,
        impressions: Math.floor(Math.random() * 10000000) + 100000,
        ctr: Math.random() * 10 + 0.1,
        cpc: Math.random() * 3 + 0.1,
      }));

      setStatsData(mockData);
      toast({
        title: "월간 검색 통계 조회 완료",
        description: `'${keyword}' 관련 키워드의 월간 통계를 조회했습니다.`,
      });

    } catch (error) {
      console.error('월간 통계 조회 오류:', error);
      toast({
        title: "조회 실패",
        description: "월간 통계 조회 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!statsData.length) return;

    const csvContent = [
      ["키워드", "월간 검색수(PC)", "월간 검색수(모바일)", "월간 검색수", "클릭수(PC)", "클릭수(모바일)", "클릭률(PC)", "클릭률(모바일)", "경쟁도", "경쟁점수", "평균순위", "노출수", "클릭률", "클릭당비용"],
      ...statsData.map(item => [
        item.keyword,
        item.monthlyPcSearches,
        item.monthlyMobileSearches,
        item.totalSearches,
        item.pcClicks,
        item.mobileClicks,
        item.pcClickRate.toFixed(2),
        item.mobileClickRate.toFixed(2),
        item.competitionLevel,
        item.competitionScore,
        item.avgPosition.toFixed(1),
        item.impressions,
        item.ctr.toFixed(3),
        item.cpc.toFixed(5)
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

  return (
    <div className="space-y-6">
      {/* 검색 영역 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="키워드를 입력하세요 (예: 김치, 마스크, 스마트폰 등)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchMonthlyStats()}
            className="h-12 text-lg"
          />
        </div>
        <Button 
          onClick={searchMonthlyStats} 
          disabled={loading}
          className="h-12 px-8 bg-green-600 hover:bg-green-700"
        >
          <Search className="h-4 w-4 mr-2" />
          {loading ? "조회중..." : "월간통계 조회"}
        </Button>
      </div>

      {/* 검색 정보 헤더 */}
      {statsData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="space-y-1">
                <div className="text-sm text-gray-600">
                  키워드: <span className="font-medium">{keyword}</span>
                </div>
                <div className="text-sm text-gray-600">
                  총 키워드: {statsData.length}개
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

      {/* 월간 통계 테이블 */}
      {statsData.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-32 text-center">키워드</TableHead>
                    <TableHead className="w-24 text-center">월간 검색수(PC)</TableHead>
                    <TableHead className="w-24 text-center">월간 검색수(모바일)</TableHead>
                    <TableHead className="w-24 text-center">월간 검색수</TableHead>
                    <TableHead className="w-20 text-center">클릭수(PC)</TableHead>
                    <TableHead className="w-20 text-center">클릭수(모바일)</TableHead>
                    <TableHead className="w-20 text-center">클릭률(PC)</TableHead>
                    <TableHead className="w-20 text-center">클릭률(모바일)</TableHead>
                    <TableHead className="w-16 text-center">경쟁도</TableHead>
                    <TableHead className="w-16 text-center">경쟁점수</TableHead>
                    <TableHead className="w-16 text-center">평균순위</TableHead>
                    <TableHead className="w-20 text-center">노출수</TableHead>
                    <TableHead className="w-16 text-center">클릭률</TableHead>
                    <TableHead className="w-20 text-center">클릭당비용</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statsData.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{item.keyword}</TableCell>
                      <TableCell className="text-center">{item.monthlyPcSearches.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{item.monthlyMobileSearches.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">{item.totalSearches.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{item.pcClicks.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{item.mobileClicks.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{item.pcClickRate.toFixed(2)}%</TableCell>
                      <TableCell className="text-center">{item.mobileClickRate.toFixed(2)}%</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.competitionLevel === '높음' ? 'bg-red-100 text-red-700' :
                          item.competitionLevel === '중간' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {item.competitionLevel}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{item.competitionScore}</TableCell>
                      <TableCell className="text-center">{item.avgPosition.toFixed(1)}</TableCell>
                      <TableCell className="text-center">{item.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{item.ctr.toFixed(3)}%</TableCell>
                      <TableCell className="text-center">{item.cpc.toFixed(5)}</TableCell>
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">월간 통계를 조회 중입니다...</p>
        </div>
      )}

      {/* 검색 결과 없음 */}
      {!loading && !statsData.length && keyword && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">월간 통계 결과가 없습니다.</p>
          <p className="text-gray-400">다른 키워드로 검색해보세요.</p>
        </div>
      )}
    </div>
  );
};

export default MonthlySearchStats;
