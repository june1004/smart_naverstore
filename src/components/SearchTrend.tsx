
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Plus, X, Calendar, BarChart3, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrendData {
  period: string;
  ratio: number;
}

interface KeywordTrend {
  title: string;
  keywords: string[];
  data: TrendData[];
}

const SearchTrend = () => {
  const [keywords, setKeywords] = useState<string[]>([""]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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

  const handleKeywordKeyPress = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // 현재 입력창이 비어있지 않고 마지막 키워드가 아니면 다음 키워드로 이동
      if (keywords[index].trim() && index < keywords.length - 1) {
        const nextInput = document.querySelector(`input[data-keyword-index="${index + 1}"]`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      } else if (keywords[index].trim()) {
        // 마지막 키워드이거나 현재 키워드가 채워져 있으면 트렌드 분석 실행
        searchTrend();
      }
    }
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
      const { data, error } = await supabase.functions.invoke('naver-datalab-trend', {
        body: {
          keywords: validKeywords,
          startDate,
          endDate,
          timeUnit: 'month',
          device: '',
          ages: [],
          gender: ''
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // 키워드명으로 차트 데이터 매핑
      const mappedData = (data.results || []).map((trend: KeywordTrend, index: number) => ({
        ...trend,
        title: validKeywords[index] || trend.title, // 실제 키워드명 사용
        displayName: validKeywords[index] || trend.title
      }));

      setTrendData(mappedData);
      toast({
        title: "트렌드 분석 완료",
        description: `${validKeywords.length}개 키워드의 트렌드 데이터를 가져왔습니다.`,
      });

    } catch (error) {
      console.error('트렌드 분석 오류:', error);
      toast({
        title: "분석 실패",
        description: "트렌드 분석 중 오류가 발생했습니다. API 키 설정을 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 차트 데이터 변환 (모든 키워드의 데이터를 하나의 배열로 합치기)
  const chartData = () => {
    if (!trendData.length) return [];
    
    const allPeriods = [...new Set(
      trendData.flatMap(trend => trend.data.map(d => d.period))
    )].sort();

    return allPeriods.map(period => {
      const dataPoint: any = { period };
      trendData.forEach((trend, index) => {
        const data = trend.data.find(d => d.period === period);
        dataPoint[trend.title] = data ? data.ratio : 0;
      });
      return dataPoint;
    });
  };

  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <div className="space-y-6">
      {/* 검색 설정 */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            트렌드 분석 설정
          </CardTitle>
          <p className="text-green-100 text-sm">
            키워드를 입력하고 Enter를 눌러 빠르게 트렌드를 분석해보세요
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* 키워드 입력 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">검색 키워드</label>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                최대 5개 • Enter로 빠른 분석
              </span>
            </div>
            <div className="space-y-3">
              {keywords.map((keyword, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <Input
                    placeholder={`키워드 ${index + 1} (Enter로 분석 실행)`}
                    value={keyword}
                    onChange={(e) => updateKeyword(index, e.target.value)}
                    onKeyPress={(e) => handleKeywordKeyPress(e, index)}
                    data-keyword-index={index}
                    className="flex-1 border-2 border-gray-200 focus:border-green-500 transition-colors"
                  />
                  {keywords.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeKeyword(index)}
                      className="px-3 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
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
                  className="w-full gap-2 py-3 border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 text-green-700"
                >
                  <Plus className="h-4 w-4" />
                  키워드 추가
                </Button>
              )}
            </div>
          </div>

          {/* 날짜 범위 */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              분석 기간
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">시작일</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">종료일</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={searchTrend} 
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-3 text-base font-semibold"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            {loading ? "분석중..." : "트렌드 분석 시작"}
          </Button>
        </CardContent>
      </Card>

      {/* 트렌드 차트 */}
      {trendData.length > 0 && (
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              검색어 트렌드 분석 결과
            </CardTitle>
            <p className="text-blue-100 text-sm">
              {trendData.map(trend => trend.title).join(', ')} 키워드 비교 분석
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-96 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis 
                    dataKey="period"
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  {trendData.map((trend, index) => (
                    <Line
                      key={trend.title}
                      dataKey={trend.title}
                      name={trend.title}
                      stroke={colors[index % colors.length]}
                      strokeWidth={3}
                      dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* 키워드 요약 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {trendData.map((trend, index) => (
                <div 
                  key={trend.title} 
                  className="p-4 bg-gray-50 rounded-lg border-l-4 transition-all hover:shadow-md"
                  style={{ borderLeftColor: colors[index % colors.length] }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-sm font-semibold text-gray-800">{trend.title}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    최근 검색량: {trend.data[trend.data.length - 1]?.ratio || 0}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">트렌드 분석 중입니다</h3>
          <p className="text-gray-600">키워드별 검색 트렌드를 분석하고 있어요...</p>
        </div>
      )}

      {/* 분석 팁 */}
      {!loading && trendData.length === 0 && (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">트렌드 분석을 시작해보세요</h3>
            <p className="text-gray-500 mb-4">키워드를 입력하고 Enter를 눌러 빠르게 분석할 수 있습니다</p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>💡 팁: 최대 5개의 키워드를 비교 분석할 수 있어요</p>
              <p>📊 분석 결과는 시각적 차트로 제공됩니다</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchTrend;
