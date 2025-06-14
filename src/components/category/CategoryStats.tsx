
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CategoryStatsProps {
  onLevelFilter: (level: number | null) => void;
}

const CategoryStats = ({ onLevelFilter }: CategoryStatsProps) => {
  // 카테고리 통계 조회
  const { data: categoryStats, isLoading } = useQuery({
    queryKey: ['category-stats'],
    queryFn: async () => {
      console.log('카테고리 통계 조회 시작');
      
      // 전체 카테고리 통계를 한 번에 조회 (is_active 필터 제거하여 전체 데이터 조회)
      const { data: allCategories, error } = await supabase
        .from('naver_categories')
        .select('category_level, category_path, is_active');
      
      if (error) {
        console.error('카테고리 통계 조회 오류:', error);
        throw error;
      }

      const stats = {
        total: 0,
        level1: 0,
        level2: 0,
        level3: 0,
        level4: 0
      };

      // 모든 카테고리 포함 (활성/비활성 상관없이)
      const categories = allCategories || [];
      
      stats.total = categories.length;

      categories.forEach(category => {
        switch (category.category_level) {
          case 1:
            stats.level1++;
            break;
          case 2:
            stats.level2++;
            break;
          case 3:
            stats.level3++;
            break;
          case 4:
            stats.level4++;
            break;
        }
      });

      console.log('카테고리 통계:', stats);
      return stats;
    },
    refetchInterval: 30000, // 30초마다 자동 갱신
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            카테고리 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          카테고리 통계
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onLevelFilter(null)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{categoryStats?.total || 0}</div>
              <div className="text-sm text-gray-600">전체</div>
            </div>
          </Card>
          <Card className="p-3 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => onLevelFilter(1)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{categoryStats?.level1 || 0}</div>
              <div className="text-sm text-gray-600">대분류</div>
            </div>
          </Card>
          <Card className="p-3 cursor-pointer hover:bg-green-50 transition-colors" onClick={() => onLevelFilter(2)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{categoryStats?.level2 || 0}</div>
              <div className="text-sm text-gray-600">중분류</div>
            </div>
          </Card>
          <Card className="p-3 cursor-pointer hover:bg-orange-50 transition-colors" onClick={() => onLevelFilter(3)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{categoryStats?.level3 || 0}</div>
              <div className="text-sm text-gray-600">소분류</div>
            </div>
          </Card>
          <Card className="p-3 cursor-pointer hover:bg-purple-50 transition-colors" onClick={() => onLevelFilter(4)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{categoryStats?.level4 || 0}</div>
              <div className="text-sm text-gray-600">세분류</div>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryStats;
