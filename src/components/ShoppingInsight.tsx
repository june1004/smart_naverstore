
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar } from "lucide-react";

interface InsightData {
  category: string;
  ratio: number;
  change: number;
}

interface AgeGroupData {
  ageGroup: string;
  ratio: number;
}

interface GenderData {
  gender: string;
  ratio: number;
}

const ShoppingInsight = () => {
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [insightData, setInsightData] = useState<InsightData[]>([]);
  const [ageData, setAgeData] = useState<AgeGroupData[]>([]);
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const categories = [
    { value: "50000000", label: "패션의류" },
    { value: "50000001", label: "패션잡화" },
    { value: "50000002", label: "화장품/미용" },
    { value: "50000003", label: "디지털/가전" },
    { value: "50000004", label: "가구/인테리어" },
    { value: "50000005", label: "출산/육아" },
    { value: "50000006", label: "식품" },
    { value: "50000007", label: "스포츠/레저" }
  ];

  const getInsight = async () => {
    if (!category) {
      toast({
        title: "카테고리를 선택해주세요",
        description: "분석할 카테고리를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "날짜를 선택해주세요",
        description: "분석 기간을 설정해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 네이버 쇼핑인사이트 API 호출 시뮬레이션
      const mockInsightData: InsightData[] = [
        { category: "상의", ratio: 35.2, change: 5.3 },
        { category: "하의", ratio: 28.7, change: -2.1 },
        { category: "아우터", ratio: 20.5, change: 8.7 },
        { category: "원피스", ratio: 10.1, change: -1.2 },
        { category: "기타", ratio: 5.5, change: 3.4 }
      ];

      const mockAgeData: AgeGroupData[] = [
        { ageGroup: "10대", ratio: 12.3 },
        { ageGroup: "20대", ratio: 34.7 },
        { ageGroup: "30대", ratio: 28.9 },
        { ageGroup: "40대", ratio: 16.8 },
        { ageGroup: "50대+", ratio: 7.3 }
      ];

      const mockGenderData: GenderData[] = [
        { gender: "여성", ratio: 68.5 },
        { gender: "남성", ratio: 31.5 }
      ];

      setTimeout(() => {
        setInsightData(mockInsightData);
        setAgeData(mockAgeData);
        setGenderData(mockGenderData);
        setLoading(false);
        toast({
          title: "인사이트 분석 완료",
          description: "쇼핑 인사이트 데이터를 성공적으로 가져왔습니다.",
        });
      }, 1500);

    } catch (error) {
      setLoading(false);
      toast({
        title: "분석 실패",
        description: "인사이트 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* 분석 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            쇼핑인사이트 분석 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 카테고리 선택 */}
          <div>
            <label className="text-sm font-medium mb-2 block">카테고리</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="분석할 카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 날짜 범위 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">시작일</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">종료일</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <Button 
            onClick={getInsight} 
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {loading ? "분석중..." : "인사이트 분석"}
          </Button>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {insightData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 카테고리별 비율 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                카테고리별 쇼핑 비율
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insightData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${value}%`, 
                        name === 'ratio' ? '비율' : '변화율'
                      ]}
                    />
                    <Bar dataKey="ratio" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 연령대별 분포 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                연령대별 분포
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ ageGroup, ratio }) => `${ageGroup} ${ratio}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="ratio"
                    >
                      {ageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${value}%`, '비율']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 성별 분포 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                성별 분포
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ gender, ratio }) => `${gender} ${ratio}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="ratio"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${value}%`, '비율']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 트렌드 변화 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                전월 대비 변화율
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insightData.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{item.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{item.ratio}%</span>
                      <span className={`text-sm font-medium ${
                        item.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.change > 0 ? '+' : ''}{item.change}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">인사이트 분석 중입니다...</p>
        </div>
      )}
    </div>
  );
};

export default ShoppingInsight;
