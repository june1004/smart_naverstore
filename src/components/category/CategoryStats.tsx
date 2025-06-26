import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MutableRefObject, useEffect, useState } from "react";

interface CategoryStatsProps {
  onLevelFilter: (level: number | null) => void;
  refetchRef?: MutableRefObject<any>;
}

const CategoryStats = ({ onLevelFilter, refetchRef }: CategoryStatsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // 드릴다운 상태 관리
  const [selectedLarge, setSelectedLarge] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedSmall, setSelectedSmall] = useState<string | null>(null);

  // 카테고리 전체 row 조회 (category_path)
  const { data: allCategories, isLoading, error, refetch } = useQuery({
    queryKey: ["category-stats-drilldown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("naver_categories")
        .select("category_path")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // 네이버 기준 11개 대분류명, 지정 순서
  const NAVER_LARGE_CATEGORIES = [
    "가구/인테리어",
    "도서",
    "디지털/가전",
    "생활/건강",
    "스포츠/레저",
    "식품",
    "여가/생활편의",
    "출산/육아",
    "패션의류",
    "패션잡화",
    "화장품/미용",
  ];
  function normalize(str: string) {
    return (str || "").replace(/\s/g, "").toLowerCase();
  }
  function matchLargeCategory(a: string, b: string) {
    return normalize(a) === normalize(b);
  }

  // 계층별 파싱
  function parseCategoryPathParts(category_path: string = "") {
    const parts = category_path.split(" > ").map((s) => s.trim());
    return {
      large: parts[0] || "",
      medium: parts[1] || "",
      small: parts[2] || "",
      smallest: parts[3] || "",
    };
  }

  // 대분류 리스트
  const largeList = NAVER_LARGE_CATEGORIES;
  // 중분류 리스트
  const mediumList = selectedLarge
    ? Array.from(
        new Set(
          (allCategories || [])
            .filter((row) => matchLargeCategory(parseCategoryPathParts(row.category_path).large, selectedLarge))
            .map((row) => parseCategoryPathParts(row.category_path).medium)
            .filter(Boolean)
        )
      )
    : [];
  // 소분류 리스트
  const smallList = selectedLarge && selectedMedium
    ? Array.from(
        new Set(
          (allCategories || [])
            .filter((row) => {
              const parts = parseCategoryPathParts(row.category_path);
              return matchLargeCategory(parts.large, selectedLarge) && parts.medium === selectedMedium;
            })
            .map((row) => parseCategoryPathParts(row.category_path).small)
            .filter(Boolean)
        )
      )
    : [];
  // 세분류 리스트
  const smallestList = selectedLarge && selectedMedium && selectedSmall
    ? Array.from(
        new Set(
          (allCategories || [])
            .filter((row) => {
              const parts = parseCategoryPathParts(row.category_path);
              return (
                matchLargeCategory(parts.large, selectedLarge) &&
                parts.medium === selectedMedium &&
                parts.small === selectedSmall
              );
            })
            .map((row) => parseCategoryPathParts(row.category_path).smallest)
            .filter(Boolean)
        )
      )
    : [];

  // 핸들러
  const handleLargeClick = (name: string) => {
    setSelectedLarge(name);
    setSelectedMedium(null);
    setSelectedSmall(null);
  };
  const handleMediumClick = (name: string) => {
    setSelectedMedium(name);
    setSelectedSmall(null);
  };
  const handleSmallClick = (name: string) => {
    setSelectedSmall(name);
  };
  const handleReset = () => {
    setSelectedLarge(null);
    setSelectedMedium(null);
    setSelectedSmall(null);
  };

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
        <div className="mb-2 flex gap-2 items-center">
          <span className="font-bold">카테고리 드릴다운</span>
          {(selectedLarge || selectedMedium || selectedSmall) && (
            <button className="ml-2 text-xs text-gray-500 underline" onClick={handleReset}>전체보기</button>
          )}
        </div>
        <div className="flex flex-row gap-4 w-full">
          {/* 대분류 */}
          <div className="flex-1 min-w-[120px]">
            <div className="font-semibold mb-1">대분류</div>
            <div className="flex flex-col gap-1">
              {largeList.map((name) => (
                <button
                  key={name}
                  className={`px-3 py-1 rounded border text-sm text-left ${selectedLarge === name ? 'bg-blue-100 font-bold border-blue-400' : 'hover:bg-blue-50'}`}
                  onClick={() => handleLargeClick(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          {/* 중분류 */}
          <div className="flex-1 min-w-[120px]">
            <div className="font-semibold mb-1">중분류</div>
            <div className="flex flex-col gap-1">
              {mediumList.length === 0 && <div className="text-xs text-gray-400">대분류 선택</div>}
              {mediumList.map((name) => (
                <button
                  key={name}
                  className={`px-3 py-1 rounded border text-sm text-left ${selectedMedium === name ? 'bg-green-100 font-bold border-green-400' : 'hover:bg-green-50'}`}
                  onClick={() => handleMediumClick(name)}
                  disabled={!selectedLarge}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          {/* 소분류 */}
          <div className="flex-1 min-w-[120px]">
            <div className="font-semibold mb-1">소분류</div>
            <div className="flex flex-col gap-1">
              {smallList.length === 0 && <div className="text-xs text-gray-400">중분류 선택</div>}
              {smallList.map((name) => (
                <button
                  key={name}
                  className={`px-3 py-1 rounded border text-sm text-left ${selectedSmall === name ? 'bg-orange-100 font-bold border-orange-400' : 'hover:bg-orange-50'}`}
                  onClick={() => handleSmallClick(name)}
                  disabled={!selectedMedium}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          {/* 세분류 */}
          <div className="flex-1 min-w-[120px]">
            <div className="font-semibold mb-1">세분류</div>
            <div className="flex flex-col gap-1">
              {smallestList.length === 0 && <div className="text-xs text-gray-400">소분류 선택</div>}
              {smallestList.map((name) => (
                <div
                  key={name}
                  className={`px-3 py-1 rounded border text-sm text-left bg-purple-50`}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryStats;
