import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search, TrendingUp, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKeyword } from "@/contexts/KeywordContext";
import { useAuth } from "@/contexts/AuthContext";

interface TrendData {
  date: string;
  value: number;
}

interface SearchTermData {
  period: string;
  ratio: number;
}

const TrendAnalysis = () => {
  const [keyword, setKeyword] = useState("");
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [searchTermData, setSearchTermData] = useState<SearchTermData[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { sharedKeyword } = useKeyword();
  const { user } = useAuth();

  // 공유된 키워드로 초기화
  useEffect(() => {
    if (sharedKeyword && !keyword) {
      setKeyword(sharedKeyword);
    }
  }, [sharedKeyword, keyword]);

  // 인증되지 않은 사용자 체크
  useEffect(() => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "트렌드 분석 기능을 사용하려면 로그인해주세요.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const analyzeTrend = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "회원가입 또는 로그인 후 이용해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!keyword.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "분석할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 트렌드 데이터 가져오기
      const { data: trendResponse, error: trendError } = await supabase.functions.invoke('trend-data', {
        body: { keyword: keyword.trim(), startDate, endDate }
      });

      if (trendError) {
        throw new Error(trendError.message);
      }

      setTrendData(trendResponse);

      // 검색어별 데이터 가져오기
      const { data: searchTermResponse, error: searchTermError } = await supabase.functions.invoke('searchterm-data', {
        body: { keyword: keyword.trim(), startDate, endDate }
      });

      if (searchTermError) {
        throw new Error(searchTermError.message);
      }

      setSearchTermData(searchTermResponse);

      toast({
        title: "분석 완료",
        description: `'${keyword}' 키워드 트렌드 분석이 완료되었습니다.`,
      });

    } catch (error) {
      console.error('트렌드 분석 오류:', error);
      toast({
        title: "분석 실패",
        description: "트렌드 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = formatDate(new Date());
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekFormatted = formatDate(lastWeek);

  return (
    <div className="space-y-6">
      {/* 로그인 안내 */}
      {!user && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <User className="h-4 w-4" />
              <span className="font-medium">로그인이 필요한 기능입니다</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              트렌드 분석 기능을 사용하려면 회원가입 또는 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 검색 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            트렌드 분석
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="분석할 키워드를 입력하세요"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && analyzeTrend()}
              className="md:col-span-2"
              disabled={!user}
            />
            <Button 
              onClick={analyzeTrend} 
              disabled={loading || !user}
              className="bg-green-600 hover:bg-green-700"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? "분석중..." : "트렌드 분석"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">시작 날짜</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                defaultValue={lastWeekFormatted}
                className="text-sm"
                disabled={!user}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">종료 날짜</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                defaultValue={today}
                className="text-sm"
                disabled={!user}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {trendData.length > 0 && searchTermData.length > 0 && (
        <div className="space-y-6">
          {/* 트렌드 라인 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                "{keyword}" 트렌드 변화
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 검색어별 데이터 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                "{keyword}" 검색어별 데이터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        기간
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        비율
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchTermData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.ratio}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">트렌드를 분석하고 있습니다...</p>
        </div>
      )}
    </div>
  );
};

export default TrendAnalysis;
