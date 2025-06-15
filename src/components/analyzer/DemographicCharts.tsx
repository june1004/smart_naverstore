
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users } from "lucide-react";

interface DemographicData {
  age: Array<{ range: string; percentage: number }>;
  gender: Array<{ type: string; percentage: number }>;
  device: Array<{ type: string; percentage: number }>;
}

interface DemographicChartsProps {
  demographicAnalysis: DemographicData;
}

const DemographicCharts = ({ demographicAnalysis }: DemographicChartsProps) => {
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 연령별 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-4 w-4" />
            연령별 검색 패턴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographicAnalysis?.age || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Bar dataKey="percentage" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 성별 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">성별 검색 패턴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographicAnalysis?.gender || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="percentage"
                  label={({ type, percentage }) => `${type} ${percentage}%`}
                >
                  {(demographicAnalysis?.gender || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 기기별 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">기기별 검색 패턴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographicAnalysis?.device || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="percentage"
                  label={({ type, percentage }) => `${type} ${percentage}%`}
                >
                  {(demographicAnalysis?.device || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index + 2]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemographicCharts;
