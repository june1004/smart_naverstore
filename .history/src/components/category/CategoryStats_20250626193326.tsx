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

  // 계층별 unique 집계
  let filtered = allCategories || [];
  let currentLevel = 0;
  let currentLabel = "전체";
  let currentList: string[] = [];
  let currentCount = filtered.length;
  let parentLabel = null;

  if (selectedLarge && !selectedMedium && !selectedSmall) {
    filtered = filtered.filter((row) => matchLargeCategory(parseCategoryPathParts(row.category_path).large, selectedLarge));
    currentLevel = 1;
    currentLabel = `대분류: ${selectedLarge}`;
    currentList = Array.from(new Set(filtered.map((row) => parseCategoryPathParts(row.category_path).medium).filter(Boolean)));
    currentCount = currentList.length;
    parentLabel = selectedLarge;
  } else if (selectedLarge && selectedMedium && !selectedSmall) {
    filtered = filtered.filter((row) => {
      const parts = parseCategoryPathParts(row.category_path);
      return matchLargeCategory(parts.large, selectedLarge) && parts.medium === selectedMedium;
    });
    currentLevel = 2;
    currentLabel = `중분류: ${selectedMedium}`;
    currentList = Array.from(new Set(filtered.map((row) => parseCategoryPathParts(row.category_path).small).filter(Boolean)));
    currentCount = currentList.length;
    parentLabel = selectedMedium;
  } else if (selectedLarge && selectedMedium && selectedSmall) {
    filtered = filtered.filter((row) => {
      const parts = parseCategoryPathParts(row.category_path);
      return matchLargeCategory(parts.large, selectedLarge) && parts.medium === selectedMedium && parts.small === selectedSmall;
    });
    currentLevel = 3;
    currentLabel = `소분류: ${selectedSmall}`;
    currentList = Array.from(new Set(filtered.map((row) => parseCategoryPathParts(row.category_path).smallest).filter(Boolean)));
    currentCount = currentList.length;
    parentLabel = selectedSmall;
  } else {
    // 전체
    currentLevel = 0;
    currentLabel = "전체";
    currentList = NAVER_LARGE_CATEGORIES;
    currentCount = NAVER_LARGE_CATEGORIES.length;
  }

  // 상위로 이동 핸들러
  const handleBack = () => {
    if (selectedLarge && selectedMedium && selectedSmall) {
      setSelectedSmall(null);
    } else if (selectedLarge && selectedMedium) {
      setSelectedMedium(null);
    } else if (selectedLarge) {
      setSelectedLarge(null);
    }
  };

  // 클릭 핸들러
  const handleClick = (name: string) => {
    if (!selectedLarge) setSelectedLarge(name);
    else if (!selectedMedium) setSelectedMedium(name);
    else if (!selectedSmall) setSelectedSmall(name);
  };

  // 전체로 이동
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
          <span className="font-bold">{currentLabel}</span>
          <span className="text-sm text-gray-500">({currentCount}개)</span>
          {(selectedLarge || selectedMedium || selectedSmall) && (
            <button className="ml-2 text-xs text-blue-600 underline" onClick={handleBack}>상위로</button>
          )}
          {(selectedLarge || selectedMedium || selectedSmall) && (
            <button className="ml-2 text-xs text-gray-500 underline" onClick={handleReset}>전체보기</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {currentList.map((name) => (
            <button
              key={name}
              className="px-3 py-1 rounded border text-sm hover:bg-blue-50"
              onClick={() => handleClick(name)}
              disabled={currentLevel === 3}
            >
              {name}
            </button>
          ))}
        </div>
        {/* 예시 목록 */}
        {currentLevel === 3 && (
          <div className="text-xs text-gray-500">세분류 예시: {currentList.slice(0, 10).join(", ")}</div>
        )}
        {currentLevel === 0 && (
          <div className="text-xs text-gray-500">대분류(11개): {NAVER_LARGE_CATEGORIES.join(", ")}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryStats;
