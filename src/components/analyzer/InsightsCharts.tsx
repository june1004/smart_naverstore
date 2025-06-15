
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PriceAnalysis {
  range: string;
  count: number;
  percentage: string;
}

interface ClickTrend {
  period: string;
  ratio: number;
}

interface InsightsChartsProps {
  priceAnalysis: PriceAnalysis[];
  clickTrends: ClickTrend[];
}

const InsightsCharts = ({ priceAnalysis, clickTrends }: InsightsChartsProps) => {
  return (
    <div className="space-y-4">
      {/* 가격대별 검색 비중 분석 */}
      <Card>
        <CardHeader>
          <CardTitle>가격대별 검색 비중 분석</CardTitle>
          <p className="text-sm text-gray-600">시장 가격대 추정을 위한 분석</p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceAnalysis || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${value}개`, '상품 수']}
                />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 실시간 검색 클릭 추이 */}
      <Card>
        <CardHeader>
          <CardTitle>실시간 검색 클릭 추이 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clickTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${value}`, '클릭 지수']}
                  labelFormatter={(label) => `기간: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="ratio" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsCharts;
