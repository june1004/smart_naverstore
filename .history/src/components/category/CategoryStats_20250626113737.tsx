import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MutableRefObject, useEffect } from "react";

interface CategoryStatsProps {
  onLevelFilter: (level: number | null) => void;
  refetchRef?: MutableRefObject<any>;
}

const CategoryStats = ({ onLevelFilter, refetchRef }: CategoryStatsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // 카테고리 통계 조회 (실제 데이터베이스에서 정확한 카운트)
  const { data: categoryStats, isLoading, refetch } = useQuery({
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

        // 분류별 유니크 값, 개수, 예시 추출
        const largeSet = new Set<string>();
        const mediumSet = new Set<string>();
        const smallSet = new Set<string>();
        const smallestSet = new Set<string>();
        allCategories?.forEach(category => {
          if (category.category_path) {
            const pathParts = category.category_path.split(' > ').map(s => s.trim()).filter(Boolean);
            if (pathParts[0]) largeSet.add(pathParts[0]);
            if (pathParts[1]) mediumSet.add(pathParts[1]);
            if (pathParts[2]) smallSet.add(pathParts[2]);
            if (pathParts[3]) smallestSet.add(pathParts[3]);
          }
        });
        // 가나다순, 최대 5개 예시
        const getExamples = (set: Set<string>) => Array.from(set).sort((a, b) => a.localeCompare(b, 'ko')).slice(0, 5);
        const stats = {
          total: totalCount || 0,
          large: { count: largeSet.size, examples: getExamples(largeSet) },
          medium: { count: mediumSet.size, examples: getExamples(mediumSet) },
          small: { count: smallSet.size, examples: getExamples(smallSet) },
          smallest: { count: smallestSet.size, examples: getExamples(smallestSet) }
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

  useEffect(() => {
    if (refetchRef) refetchRef.current = refetch;
  }, [refetch, refetchRef]);

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
        <div className="grid grid-cols-5 gap-4">
          {/* 전체 */}
          <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => handleCategoryClick(null)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{categoryStats?.total || 0}</div>
              <div className="text-sm text-gray-600">전체</div>
            </div>
          </Card>
          {/* 대분류 */}
          <Card className="p-3 cursor-pointer hover:bg-blue-50" onClick={() => handleCategoryClick(1)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{categoryStats?.large?.count || 0}</div>
              <div className="text-sm text-gray-600">대분류</div>
              <div className="text-xs text-gray-500 mt-1">{categoryStats?.large?.examples?.join(', ')}</div>
            </div>
          </Card>
          {/* 중분류 */}
          <Card className="p-3 cursor-pointer hover:bg-green-50" onClick={() => handleCategoryClick(2)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{categoryStats?.medium?.count || 0}</div>
              <div className="text-sm text-gray-600">중분류</div>
              <div className="text-xs text-gray-500 mt-1">{categoryStats?.medium?.examples?.join(', ')}</div>
            </div>
          </Card>
          {/* 소분류 */}
          <Card className="p-3 cursor-pointer hover:bg-orange-50" onClick={() => handleCategoryClick(3)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{categoryStats?.small?.count || 0}</div>
              <div className="text-sm text-gray-600">소분류</div>
              <div className="text-xs text-gray-500 mt-1">{categoryStats?.small?.examples?.join(', ')}</div>
            </div>
          </Card>
          {/* 세분류 */}
          <Card className="p-3 cursor-pointer hover:bg-purple-50" onClick={() => handleCategoryClick(4)}>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{categoryStats?.smallest?.count || 0}</div>
              <div className="text-sm text-gray-600">세분류</div>
              <div className="text-xs text-gray-500 mt-1">{categoryStats?.smallest?.examples?.join(', ')}</div>
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
