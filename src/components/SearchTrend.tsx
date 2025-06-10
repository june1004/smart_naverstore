
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, Plus, X } from "lucide-react";

interface TrendData {
  period: string;
  ratio: number;
}

interface KeywordTrend {
  keyword: string;
  data: TrendData[];
}

const SearchTrend = () => {
  const [keywords, setKeywords] = useState<string[]>([""]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [trendData, setTrendData] = useState<KeywordTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addKeyword = () => {
    if (keywords.length < 5) {
      setKeywords([...keywords, ""]);
    } else {
      toast({
        title: "키워드 제한",
        description: "최대 5개까지 키워드를 추가할 수 있습니다.",
        variant: "destructive",
      });
    }
  };

  const removeKeyword = (index: number) => {
    if (keywords.length > 1) {
      setKeywords(keywords.filter((_, i) => i !== index));
    }
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const searchTrend = async () => {
    const validKeywords = keywords.filter(k => k.trim());
    
    if (validKeywords.length === 0) {
      toast({
        title: "키워드를 입력해주세요",
        description: "최소 1개 이상의 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "날짜를 선택해주세요",
        description: "검색 기간을 설정해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 네이버 통합검색어 트렌드 API 호출 시뮬레이션
      const mockTrendData: KeywordTrend[] = validKeywords.map((keyword, index) => ({
        keyword,
        data: [
          { period: "2024-01", ratio: 80 + Math.random() * 20 },
          { period: "2024-02", ratio: 85 + Math.random() * 15 },
          { period: "2024-03", ratio: 75 + Math.random() * 25 },
          { period: "2024-04", ratio: 90 + Math.random() * 10 },
          { period: "2024-05", ratio: 95 + Math.random() * 5 },
          { period: "2024-06", ratio: 88 + Math.random() * 12 },
        ]
      }));

      setTimeout(() => {
        setTrendData(mockTrendData);
        setLoading(false);
        toast({
          title: "트렌드 분석 완료",
          description: `${validKeywords.length}개 키워드의 트렌드 데이터를 가져왔습니다.`,
        });
      }, 1500);

    } catch (error) {
      setLoading(false);
      toast({
        title: "분석 실패",
        description: "트렌드 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <div className="space-y-6">
      {/* 검색 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            트렌드 분석 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 키워드 입력 */}
          <div>
            <label className="text-sm font-medium mb-2 block">검색 키워드 (최대 5개)</label>
            <div className="space-y-2">
              {keywords.map((keyword, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`키워드 ${index + 1}`}
                    value={keyword}
                    onChange={(e) => updateKeyword(index, e.target.value)}
                    className="flex-1"
                  />
                  {keywords.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeKeyword(index)}
                      className="px-3"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {keywords.length < 5 && (
                <Button
                  variant="outline"
                  onClick={addKeyword}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  키워드 추가
                </Button>
              )}
            </div>
          </div>

          {/* 날짜 범위 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">시작일</label>
              <div className="relative">
                <Input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                />
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">종료일</label>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                />
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <Button 
            onClick={searchTrend} 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {loading ? "분석중..." : "트렌드 분석"}
          </Button>
        </CardContent>
      </Card>

      {/* 트렌드 차트 */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>검색어 트렌드 차트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period"
                    type="category"
                    allowDuplicatedCategory={false}
                  />
                  <YAxis />
                  <Tooltip />
                  {trendData.map((trend, index) => (
                    <Line
                      key={trend.keyword}
                      dataKey="ratio"
                      data={trend.data}
                      name={trend.keyword}
                      stroke={colors[index % colors.length]}
                      strokeWidth={3}
                      dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* 범례 */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {trendData.map((trend, index) => (
                <div key={trend.keyword} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="text-sm font-medium">{trend.keyword}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">트렌드 분석 중입니다...</p>
        </div>
      )}
    </div>
  );
};

export default SearchTrend;
