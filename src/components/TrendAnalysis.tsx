
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

const TrendAnalysis = () => {
  const [keywords, setKeywords] = useState<string[]>([""]);
  const [currentKeyword, setCurrentKeyword] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("1개월");
  const [trendData, setTrendData] = useState<KeywordTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addKeyword = () => {
    if (currentKeyword.trim() && keywords.length < 5) {
      const newKeywords = [...keywords];
      newKeywords[newKeywords.length - 1] = currentKeyword.trim();
      if (newKeywords.length < 5) {
        newKeywords.push("");
      }
      setKeywords(newKeywords);
      setCurrentKeyword("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const removeKeyword = (index: number) => {
    if (keywords.length > 1) {
      setKeywords(keywords.filter((_, i) => i !== index));
    }
  };

  const getDateRange = (period: string) => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case "1개월":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "3개월":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "1년":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1);
    }

    return {
      startDate: startDate.toISOString().split('T')[0].replace(/-/g, ''),
      endDate: endDate.toISOString().split('T')[0].replace(/-/g, '')
    };
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

    // 키워드 길이 검증
    const invalidKeywords = validKeywords.filter(k => k.length < 2);
    if (invalidKeywords.length > 0) {
      toast({
        title: "키워드 오류",
        description: "키워드는 2글자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    const { startDate, endDate } = getDateRange(selectedPeriod);
    setLoading(true);

    try {
      console.log('트렌드 분석 요청:', { validKeywords, startDate, endDate });

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
        console.error('Supabase 함수 오류:', error);
        throw new Error(error.message);
      }

      console.log('트렌드 분석 결과:', data);

      if (!data || !data.results) {
        throw new Error('응답 데이터 형식이 올바르지 않습니다.');
      }

      // 각 키워드별로 트렌드 데이터 매핑
      const mappedData = data.results.map((trend: any, index: number) => ({
        title: validKeywords[index] || trend.title,
        keywords: trend.keywords || [validKeywords[index]],
        data: trend.data || []
      }));

      setTrendData(mappedData);
      
      toast({
        title: "트렌드 분석 완료",
        description: `${validKeywords.length}개 키워드의 트렌드 데이터를 가져왔습니다.`,
      });

    } catch (error: any) {
      console.error('트렌드 분석 오류:', error);
      
      let errorMessage = "트렌드 분석 중 오류가 발생했습니다.";
      if (error.message.includes('API 키')) {
        errorMessage = "네이버 API 키 설정을 확인해주세요.";
      } else if (error.message.includes('400')) {
        errorMessage = "요청 파라미터에 오류가 있습니다. 키워드는 2글자 이상이어야 합니다.";
      } else if (error.message.includes('401')) {
        errorMessage = "API 키가 올바르지 않습니다.";
      } else if (error.message.includes('403')) {
        errorMessage = "API 사용 권한이 없습니다.";
      }
      
      toast({
        title: "분석 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const chartData = () => {
    if (!trendData.length) return [];
    
    const allPeriods = [...new Set(
      trendData.flatMap(trend => trend.data.map(d => d.period))
    )].sort();

    return allPeriods.map(period => {
      const dataPoint: any = { period };
      trendData.forEach((trend) => {
        const data = trend.data.find(d => d.period === period);
        dataPoint[trend.title] = data ? data.ratio : 0;
      });
      return dataPoint;
    });
  };

  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <div className="space-y-6">
      {/* 키워드 입력 섹션 */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            트렌드 분석 설정
          </CardTitle>
          <p className="text-green-100 text-sm">
            키워드를 입력하고 Enter를 눌러 최대 5개까지 추가하세요 (2글자 이상)
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* 키워드 입력 */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">검색 키워드</label>
            <div className="space-y-3">
              {/* 등록된 키워드 표시 */}
              {keywords.slice(0, -1).map((keyword, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                    {keyword}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeKeyword(index)}
                    className="px-3 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {/* 새 키워드 입력 */}
              {keywords.length <= 5 && (
                <div className="flex gap-3 items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                    {keywords.length}
                  </div>
                  <Input
                    placeholder={`키워드 ${keywords.length} (2글자 이상, Enter로 추가)`}
                    value={currentKeyword}
                    onChange={(e) => setCurrentKeyword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 border-2 border-gray-200 focus:border-blue-500 transition-colors"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addKeyword}
                    disabled={!currentKeyword.trim() || keywords.length >= 5 || currentKeyword.length < 2}
                    className="px-4 hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {keywords.filter(k => k.trim()).length}/5 키워드 등록됨
            </p>
          </div>

          {/* 분석 기간 선택 */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              분석 기간
            </label>
            <div className="flex gap-3">
              {["1개월", "3개월", "1년"].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? "default" : "outline"}
                  onClick={() => setSelectedPeriod(period)}
                  className={selectedPeriod === period ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={searchTrend} 
            disabled={loading || keywords.filter(k => k.trim()).length === 0}
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
              {trendData.map(trend => trend.title).join(', ')} 키워드 비교 분석 ({selectedPeriod})
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
            <p className="text-gray-500 mb-4">키워드를 입력하고 Enter를 눌러 최대 5개까지 추가하세요</p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>💡 팁: 키워드는 2글자 이상이어야 해요</p>
              <p>📊 최대 5개의 키워드를 비교 분석할 수 있어요</p>
              <p>📈 각 키워드별로 개별 트렌드가 표시됩니다</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrendAnalysis;
