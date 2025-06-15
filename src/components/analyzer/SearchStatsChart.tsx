
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar } from "lucide-react";

interface MonthlySearchStats {
  keyword: string;
  monthlyData: Array<{
    period: string;
    ratio: number;
  }>;
  competitiveness: string;
  validity: string;
}

interface SearchStatsChartProps {
  monthlySearchStats: MonthlySearchStats;
}

const SearchStatsChart = ({ monthlySearchStats }: SearchStatsChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          12개월 검색량 추이 및 경쟁률
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">경쟁률</div>
            <div className="text-2xl font-bold text-blue-600">
              {monthlySearchStats?.competitiveness || 'N/A'}
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">검색어 유효성</div>
            <div className="text-2xl font-bold text-green-600">
              {monthlySearchStats?.validity || 'N/A'}
            </div>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlySearchStats?.monthlyData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`${value}`, '검색량 지수']}
                labelFormatter={(label) => `기간: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="ratio" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchStatsChart;
