
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CategoryStatsProps {
  onLevelFilter: (level: number | null) => void;
}

const CategoryStats = ({ onLevelFilter }: CategoryStatsProps) => {
  // 카테고리 총 개수 조회
  const { data: categoryStats } = useQuery({
    queryKey: ['category-stats'],
    queryFn: async () => {
      console.log('카테고리 통계 조회 시작');
      
      const stats = {
        total: 0,
        level1: 0,
        level2: 0,
        level3: 0,
        level4: 0
      };

      // 전체 개수
      const { count: totalCount, error: totalError } = await supabase
        .from('naver_categories')
        .select('*', { count: 'exact', head: true });
      
      if (totalError) {
        console.error('전체 카테고리 개수 조회 오류:', totalError);
        throw totalError;
      }
      
      stats.total = totalCount || 0;

      // 레벨별 개수
      for (let level = 1; level <= 4; level++) {
        const { count, error } = await supabase
          .from('naver_categories')
          .select('*', { count: 'exact', head: true })
          .eq('category_level', level);
        
        if (error) {
          console.error(`레벨 ${level} 카테고리 개수 조회 오류:`, error);
        } else {
          if (level === 1) stats.level1 = count || 0;
          if (level === 2) stats.level2 = count || 0;
          if (level === 3) stats.level3 = count || 0;
          if (level === 4) stats.level4 = count || 0;
        }
      }

      console.log('카테고리 통계:', stats);
      return stats;
    },
  });

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
          <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => onLevelFilter(null)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{categoryStats?.total || 0}</div>
              <div className="text-sm text-gray-600">전체</div>
            </div>
          </Card>
          <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => onLevelFilter(1)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{categoryStats?.level1 || 0}</div>
              <div className="text-sm text-gray-600">대분류</div>
            </div>
          </Card>
          <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => onLevelFilter(2)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{categoryStats?.level2 || 0}</div>
              <div className="text-sm text-gray-600">중분류</div>
            </div>
          </Card>
          <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => onLevelFilter(3)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{categoryStats?.level3 || 0}</div>
              <div className="text-sm text-gray-600">소분류</div>
            </div>
          </Card>
          <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => onLevelFilter(4)}>
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
