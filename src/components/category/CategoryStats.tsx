import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CategoryStatsProps {
  onLevelFilter: (level: number | null) => void;
}

const CategoryStats = ({ onLevelFilter }: CategoryStatsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // 카테고리 통계 조회 (실제 데이터베이스에서 정확한 카운트)
  const { data: categoryStats, isLoading } = useQuery({
    queryKey: ['category-stats'],
    queryFn: async () => {
      console.log('카테고리 통계 조회 시작 - 레벨별 카운트');
      
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

        // 모든 카테고리 데이터 조회
        const { data: allCategories, error: categoriesError } = await supabase
          .from('naver_categories')
          .select('category_path')
          .eq('is_active', true);

        if (categoriesError) {
          console.error('카테고리 데이터 조회 오류:', categoriesError);
          throw categoriesError;
        }

        // 레벨별 카테고리 개수 계산
        let largeCategoryCount = 0;
        let mediumCategoryCount = 0;
        let smallCategoryCount = 0;
        let smallestCategoryCount = 0;

        allCategories?.forEach(category => {
          if (category.category_path) {
            const pathParts = category.category_path.split(' > ')
              .map(part => part.trim())
              .filter(part => part !== '');
            
            const level = pathParts.length;

            if (level === 1) {
              largeCategoryCount++;
            } else if (level === 2) {
              mediumCategoryCount++;
            } else if (level === 3) {
              smallCategoryCount++;
            } else if (level === 4) {
              smallestCategoryCount++;
            }
          }
        });

        const stats = {
          total: totalCount || 0,
          level1: largeCategoryCount,
          level2: mediumCategoryCount,
          level3: smallCategoryCount,
          level4: smallestCategoryCount
        };

        console.log('카테고리 통계 조회 완료:', stats);
        return stats;
      } catch (error) {
        console.error('카테고리 통계 조회 중 오류:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // 30초마다 자동 갱신
  });

  const handleCategoryClick = (level: number | null) => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "카테고리 상세 목록을 보려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }
    onLevelFilter(level);
  };

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
        <div className="grid grid-cols-4 gap-4">
          <Card 
            className={`p-3 transition-colors ${user ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-75'}`} 
            onClick={() => handleCategoryClick(null)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{categoryStats?.total || 0}</div>
              <div className="text-sm text-gray-600">전체</div>
            </div>
          </Card>
          <Card 
            className={`p-3 transition-colors ${user ? 'cursor-pointer hover:bg-blue-50' : 'cursor-not-allowed opacity-75'}`} 
            onClick={() => handleCategoryClick(1)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{categoryStats?.level1 || 0}</div>
              <div className="text-sm text-gray-600">대분류</div>
            </div>
          </Card>
          <Card 
            className={`p-3 transition-colors ${user ? 'cursor-pointer hover:bg-green-50' : 'cursor-not-allowed opacity-75'}`} 
            onClick={() => handleCategoryClick(2)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{categoryStats?.level2 || 0}</div>
              <div className="text-sm text-gray-600">중분류</div>
            </div>
          </Card>
          <Card 
            className={`p-3 transition-colors ${user ? 'cursor-pointer hover:bg-orange-50' : 'cursor-not-allowed opacity-75'}`} 
            onClick={() => handleCategoryClick(3)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{categoryStats?.level3 || 0}</div>
              <div className="text-sm text-gray-600">소분류</div>
            </div>
          </Card>
          <Card 
            className={`p-3 transition-colors ${user ? 'cursor-pointer hover:bg-purple-50' : 'cursor-not-allowed opacity-75'}`} 
            onClick={() => handleCategoryClick(4)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{categoryStats?.level4 || 0}</div>
              <div className="text-sm text-gray-600">세분류</div>
            </div>
          </Card>
        </div>
        {!user && (
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500">카테고리 상세 목록을 보려면 로그인이 필요합니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryStats;
