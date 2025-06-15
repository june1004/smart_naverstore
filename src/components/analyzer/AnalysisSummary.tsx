
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalysisSummaryProps {
  totalItems: number;
  categoriesCount: number;
  competitiveness: string;
  mainCategoryPercentage: string;
}

const AnalysisSummary = ({ 
  totalItems, 
  categoriesCount, 
  competitiveness, 
  mainCategoryPercentage 
}: AnalysisSummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>종합 분석 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {totalItems || 0}
            </div>
            <div className="text-sm text-gray-600">총 분석 상품</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {categoriesCount}
            </div>
            <div className="text-sm text-gray-600">발견된 카테고리</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {competitiveness || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">경쟁률</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {mainCategoryPercentage || 0}%
            </div>
            <div className="text-sm text-gray-600">주요 카테고리 비율</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisSummary;
