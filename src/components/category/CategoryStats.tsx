
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CategoryStatsProps {
  onLevelFilter: (level: number | null) => void;
}

const CategoryStats = ({ onLevelFilter }: CategoryStatsProps) => {
  // 카테고리 통계 조회 (실제 데이터베이스에서 정확한 카운트)
  const { data: categoryStats, isLoading } = useQuery({
    queryKey: ['category-stats'],
    queryFn: async () => {
      console.log('카테고리 통계 조회 시작 - 실제 데이터 카운트');
      
      try {
        // 전체 카테고리 수 조회 (활성 카테고리만)
        const { count: totalCount, error: totalError } = await supabase
          .from('naver_categories')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        if (totalError) {
          console.error('전체 카테고리 수 조회 오류:', totalError);
          throw totalError;
        }

        // 카테고리 경로 기반으로 실제 레벨별 데이터 조회
        const { data: allCategories, error: categoriesError } = await supabase
          .from('naver_categories')
          .select('category_path')
          .eq('is_active', true);

        if (categoriesError) {
          console.error('카테고리 데이터 조회 오류:', categoriesError);
          throw categoriesError;
        }

        // 카테고리 경로를 분석하여 실제 레벨 계산
        let level1Count = 0; // 대분류만 있는 경우
        let level2Count = 0; // 대분류 > 중분류
        let level3Count = 0; // 대분류 > 중분류 > 소분류  
        let level4Count = 0; // 대분류 > 중분류 > 소분류 > 세분류

        const level1Categories = new Set(); // 중복 제거를 위한 Set

        allCategories?.forEach(category => {
          if (category.category_path) {
            const pathParts = category.category_path.split(' > ').filter(part => part.trim() !== '');
            const actualLevel = pathParts.length;
            
            // 대분류 카운트 (중복 제거)
            if (pathParts.length > 0) {
              level1Categories.add(pathParts[0]);
            }
            
            // 각 레벨별 카운트
            switch (actualLevel) {
              case 1:
                level1Count++;
                break;
              case 2:
                level2Count++;
                break;
              case 3:
                level3Count++;
                break;
              case 4:
                level4Count++;
                break;
            }
          }
        });

        const stats = {
          total: totalCount || 0,
          level1: level1Categories.size, // 실제 대분류 개수 (중복 제거)
          level2: level2Count,
          level3: level3Count,
          level4: level4Count
        };

        console.log('카테고리 통계 조회 완료:', stats);
        console.log('대분류 목록:', Array.from(level1Categories));
        return stats;
      } catch (error) {
        console.error('카테고리 통계 조회 중 오류:', error);
        throw error;
      }
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
