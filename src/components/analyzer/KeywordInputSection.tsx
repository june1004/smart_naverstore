
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKeyword } from "@/contexts/KeywordContext";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useQuery } from "@tanstack/react-query";

interface KeywordInputSectionProps {
  onAnalysisComplete: (data: any) => void;
}

const KeywordInputSection = ({ onAnalysisComplete }: KeywordInputSectionProps) => {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { setSharedKeyword } = useKeyword();
  const { analysisResult, setAnalysisResult, isAnalysisValid } = useAnalysis();

  // 실제 카테고리 데이터 조회
  const { data: categoryData } = useQuery({
    queryKey: ['naver-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('naver_categories')
        .select('*')
        .order('category_level', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const enhanceWithRealCategories = (data: any, categories: any[]) => {
    if (!categories || !data.categoryAnalysis?.recommendedCategories) return data;

    const enhancedCategories = data.categoryAnalysis.recommendedCategories.map((category: any) => {
      console.log('원본 카테고리 정보:', category);
      
      // 카테고리 경로를 대/중/소분류로 분리
      let level1 = '', level2 = '', level3 = '';
      let matchedCategory = null;
      
      // 카테고리 이름에서 경로 분리 (예: "생활/건강 > 청소용품 > 기타청소용품")
      if (category.name && category.name.includes(' > ')) {
        const pathParts = category.name.split(' > ').map((part: string) => part.trim());
        level1 = pathParts[0] || '';
        level2 = pathParts[1] || '';
        level3 = pathParts[2] || '';
        
        console.log('분리된 카테고리:', { level1, level2, level3 });
        
        // DB에서 매칭되는 카테고리 찾기
        if (level3) {
          // 소분류까지 완전 매칭
          matchedCategory = categories.find(cat => {
            if (!cat.category_path) return false;
            const dbParts = cat.category_path.split(' > ').map((part: string) => part.trim());
            return dbParts[0] === level1 && 
                   dbParts[1] === level2 && 
                   dbParts[2] === level3 && 
                   dbParts.length === 3;
          });
        } else if (level2) {
          // 중분류까지 매칭
          matchedCategory = categories.find(cat => {
            if (!cat.category_path) return false;
            const dbParts = cat.category_path.split(' > ').map((part: string) => part.trim());
            return dbParts[0] === level1 && 
                   dbParts[1] === level2 && 
                   dbParts.length === 2;
          });
        } else if (level1) {
          // 대분류만 매칭
          matchedCategory = categories.find(cat => {
            if (!cat.category_path) return false;
            const dbParts = cat.category_path.split(' > ').map((part: string) => part.trim());
            return dbParts[0] === level1 && dbParts.length === 1;
          });
        }
      }
      
      console.log('매칭된 카테고리:', matchedCategory);

      if (matchedCategory) {
        const dbPathParts = matchedCategory.category_path ? matchedCategory.category_path.split(' > ').map((part: string) => part.trim()) : [];
        return {
          ...category,
          realCategoryPath: matchedCategory.category_path,
          realCategoryId: matchedCategory.category_id,
          realCategoryLevel: matchedCategory.category_level,
          level1: dbPathParts[0] || level1,
          level2: dbPathParts[1] || level2,
          level3: dbPathParts[2] || level3,
          hasRealCategory: true
        };
      }

      return {
        ...category,
        level1,
        level2,
        level3,
        hasRealCategory: false
      };
    });

    return {
      ...data,
      categoryAnalysis: {
        ...data.categoryAnalysis,
        recommendedCategories: enhancedCategories
      }
    };
  };

  const analyzeKeyword = async () => {
    if (!keyword.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "분석할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('auto-category-finder', {
        body: { keyword: keyword.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      // 실제 카테고리 구조와 매핑
      const enhancedData = enhanceWithRealCategories(data, categoryData);
      setAnalysisResult(enhancedData);
      
      // 분석된 키워드를 전역 상태에 저장
      setSharedKeyword(keyword.trim());

      onAnalysisComplete(enhancedData);

      toast({
        title: "분석 완료",
        description: `'${keyword}' 키워드 AI 자동 분석이 완료되었습니다.`,
      });

    } catch (error) {
      console.error('키워드 분석 오류:', error);
      toast({
        title: "분석 실패",
        description: "키워드 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI 키워드 자동 분석
        </CardTitle>
        <p className="text-sm text-gray-600">
          키워드를 입력하면 자동으로 카테고리, 검색량, 경쟁률, 트렌드 등을 종합 분석해드립니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Input
            placeholder="분석할 키워드를 입력하세요.(예:듀라코트, 아이폰 등 1개의 키워드)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && analyzeKeyword()}
            className="flex-1"
          />
          <Button 
            onClick={analyzeKeyword} 
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading ? "분석중..." : "AI 분석"}
          </Button>
        </div>
        {analysisResult && isAnalysisValid() && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            마지막 분석: {analysisResult.keyword} (분석 결과는 1시간 동안 유지됩니다)
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KeywordInputSection;
