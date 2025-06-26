
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, RotateCcw, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KeywordDetailModal from "./KeywordDetailModal";
import { useKeyword } from "@/contexts/KeywordContext";
import { useAuth } from "@/contexts/AuthContext";
import RelatedKeywordTable from "./keyword-extraction/RelatedKeywordTable";
import AutocompleteKeywordTable from "./keyword-extraction/AutocompleteKeywordTable";

interface RelatedKeyword {
  keyword: string;
  searchKeyword: string;
  monthlyPcSearchCount: number;
  monthlyMobileSearchCount: number;
  totalSearchCount: number;
  monthlyAvgPcClick: number;
  monthlyAvgMobileClick: number;
  totalAvgClick: number;
  monthlyAvgPcCtr: number;
  monthlyAvgMobileCtr: number;
  avgCtr: number;
  competition: string;
  competitionScore: number;
  plAvgDepth: number;
  originalIndex: number;
}

interface AutocompleteKeyword {
  keyword: string;
  monthlyPcSearchCount?: number;
  monthlyMobileSearchCount?: number;
  totalSearchCount?: number;
  monthlyAvgPcClick?: number;
  monthlyAvgMobileClick?: number;
  totalAvgClick?: number;
  competition?: string;
  competitionScore?: number;
  trend?: string;
  cpc?: number;
}

interface KeywordData {
  relatedKeywords: RelatedKeyword[];
  autocompleteKeywordsByKeyword: { [key: string]: AutocompleteKeyword[] };
  searchKeywords: string[];
  searchPeriod?: string;
  debug?: {
    isMultiKeyword: boolean;
  };
}

const KeywordExtraction = () => {
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [originalKeywordData, setOriginalKeywordData] = useState<KeywordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("related");
  
  // Modal state
  const [selectedKeyword, setSelectedKeyword] = useState<RelatedKeyword | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { toast } = useToast();
  const { sharedKeyword } = useKeyword();
  const { user } = useAuth();

  // 공유된 키워드로 초기화
  useEffect(() => {
    if (sharedKeyword && !keywordInput) {
      setKeywordInput(sharedKeyword);
    }
  }, [sharedKeyword, keywordInput]);

  // 인증되지 않은 사용자 체크
  useEffect(() => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "키워드 추출 기능을 사용하려면 로그인해주세요.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const extractKeywords = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "회원가입 또는 로그인 후 이용해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!keywordInput.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        description: "추출할 키워드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const keywords = keywordInput.split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, 5);

    if (keywords.length === 0) {
      toast({
        title: "유효한 키워드를 입력해주세요",
        description: "쉼표로 구분하여 최대 5개까지 입력 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('naver-searchad-keywords', {
        body: { keywords }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Process autocomplete keywords to ensure they have proper calculated fields
      const processedData = {
        ...data,
        autocompleteKeywordsByKeyword: Object.keys(data.autocompleteKeywordsByKeyword || {}).reduce((acc, key) => {
          acc[key] = (data.autocompleteKeywordsByKeyword[key] || []).map((item: AutocompleteKeyword) => ({
            ...item,
            totalSearchCount: (item.monthlyPcSearchCount || 0) + (item.monthlyMobileSearchCount || 0),
            totalAvgClick: (item.monthlyAvgPcClick || 0) + (item.monthlyAvgMobileClick || 0)
          }));
          return acc;
        }, {} as { [key: string]: AutocompleteKeyword[] })
      };

      setKeywordData(processedData);
      setOriginalKeywordData(processedData);
      
      toast({
        title: "키워드 추출 완료",
        description: `${keywords.length}개 키워드 분석이 완료되었습니다.`,
      });

    } catch (error) {
      console.error('키워드 추출 오류:', error);
      toast({
        title: "추출 실패",
        description: "키워드 추출 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchRelatedKeyword = async (keyword: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('naver-searchad-keywords', {
        body: { keywords: [keyword] }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (keywordData && data.relatedKeywords) {
        const updatedData = {
          ...keywordData,
          relatedKeywords: [...keywordData.relatedKeywords, ...data.relatedKeywords],
          searchKeywords: [...keywordData.searchKeywords, keyword]
        };
        setKeywordData(updatedData);
      }
      
      toast({
        title: "연관키워드 검색 완료",
        description: `"${keyword}"의 연관키워드가 추가되었습니다.`,
      });

    } catch (error) {
      console.error('연관키워드 검색 오류:', error);
      toast({
        title: "검색 실패",
        description: "연관키워드 검색 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreOriginalOrder = () => {
    if (originalKeywordData) {
      setKeywordData(originalKeywordData);
      
      toast({
        title: "순서 복원 완료",
        description: "원래 검색 순서로 복원되었습니다.",
      });
    }
  };

  const handleKeywordClick = (keyword: RelatedKeyword) => {
    setSelectedKeyword(keyword);
    setIsModalOpen(true);
  };

  const downloadExcel = () => {
    if (!keywordData) return;

    const relatedData = keywordData.relatedKeywords?.map((item, index) => [
      index + 1,
      item.keyword,
      item.searchKeyword,
      item.monthlyPcSearchCount,
      item.monthlyMobileSearchCount,
      item.totalSearchCount,
      item.totalAvgClick,
      `${item.avgCtr.toFixed(2)}%`,
      item.competition,
      item.competitionScore,
      item.plAvgDepth
    ]) || [];

    let autocompleteData = [];
    Object.keys(keywordData.autocompleteKeywordsByKeyword || {}).forEach(keyword => {
      autocompleteData.push([`=== ${keyword} 자동완성키워드 ===`]);
      autocompleteData.push(["순번", "키워드", "월간PC검색수", "월간모바일검색수", "월간전체검색수", "월간PC클릭수", "월간모바일클릭수", "월간전체클릭수"]);
      keywordData.autocompleteKeywordsByKeyword[keyword]?.forEach((item, index) => {
        autocompleteData.push([
          index + 1,
          item.keyword,
          item.monthlyPcSearchCount || '-',
          item.monthlyMobileSearchCount || '-',
          item.totalSearchCount || '-',
          item.monthlyAvgPcClick || '-',
          item.monthlyAvgMobileClick || '-',
          item.totalAvgClick || '-'
        ]);
      });
      autocompleteData.push([""]);
    });

    const csvContent = [
      ["=== 연관키워드 ==="],
      ["순번", "키워드", "검색키워드", "월간PC검색수", "월간모바일검색수", "월간전체검색수", "월평균클릭수", "월평균클릭률", "경쟁정도", "경쟁점수", "월평균노출광고수"],
      ...relatedData,
      [""],
      ...autocompleteData
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `키워드분석_${keywordData.searchKeywords?.join('_') || 'keywords'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "다운로드 완료",
      description: "키워드 분석 결과가 Excel 파일로 다운로드되었습니다.",
    });
  };

  return (
    <div className="space-y-6">
      {/* 로그인 안내 */}
      {!user && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <User className="h-4 w-4" />
              <span className="font-medium">로그인이 필요한 기능입니다</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              키워드 추출 기능을 사용하려면 회원가입 또는 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 검색 영역 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="키워드를 입력하세요 (쉼표로 구분, 최대 5개)"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && extractKeywords()}
            className="h-12 text-lg"
            disabled={!user}
          />
          <p className="text-sm text-gray-500 mt-1">
            {sharedKeyword ? `기본 키워드: "${sharedKeyword}" (추가 키워드 입력 가능)` : "예: 스마트폰, 아이폰, 갤럭시 (최대 5개까지)"}
          </p>
        </div>
        <Button 
          onClick={extractKeywords} 
          disabled={loading || !user}
          className="h-12 px-8 bg-purple-600 hover:bg-purple-700"
        >
          <Search className="h-4 w-4 mr-2" />
          {loading ? "분석중..." : "키워드 추출"}
        </Button>
      </div>

      {/* 결과 요약 */}
      {keywordData && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-sm text-gray-600">
                  분석 키워드: <span className="font-medium">{keywordData.searchKeywords?.join(', ')}</span>
                </div>
                <div className="text-sm text-gray-600">
                  분석 기간: <span className="font-medium">{keywordData.searchPeriod || '2025-06-12'}</span>
                </div>
                <div className="text-sm text-gray-600">
                  연관키워드: {keywordData.relatedKeywords?.length || 0}개 | 
                  자동완성 키워드: {Object.values(keywordData.autocompleteKeywordsByKeyword || {}).reduce((total, keywords) => total + keywords.length, 0)}개
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={restoreOriginalOrder} variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  순서복원
                </Button>
                <Button onClick={downloadExcel} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  엑셀다운로드
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 키워드 탭 */}
      {keywordData && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="related">연관키워드 ({keywordData.relatedKeywords?.length || 0})</TabsTrigger>
            <TabsTrigger value="autocomplete">
              자동완성키워드 ({Object.values(keywordData.autocompleteKeywordsByKeyword || {}).reduce((total, keywords) => total + keywords.length, 0)})
            </TabsTrigger>
          </TabsList>

          {/* 연관키워드 탭 */}
          <TabsContent value="related">
            <Card>
              <CardContent className="p-4">
                <RelatedKeywordTable
                  relatedKeywords={keywordData.relatedKeywords || []}
                  onKeywordClick={handleKeywordClick}
                  onSearchRelatedKeyword={searchRelatedKeyword}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 자동완성키워드 탭 */}
          <TabsContent value="autocomplete">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-green-600">
                    자동완성키워드 비교 분석
                  </CardTitle>
                  <div className="text-sm text-gray-600">
                    분석기간: {keywordData.searchPeriod || '2025-06-12'}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AutocompleteKeywordTable
                  autocompleteKeywordsByKeyword={keywordData.autocompleteKeywordsByKeyword || {}}
                  searchKeywords={keywordData.searchKeywords || []}
                  searchPeriod={keywordData.searchPeriod}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 키워드 상세 모달 */}
      <KeywordDetailModal
        keyword={selectedKeyword}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">키워드를 분석하고 있습니다...</p>
        </div>
      )}

      {!loading && !keywordData && keywordInput && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">분석 결과가 없습니다.</p>
          <p className="text-gray-400">다른 키워드로 시도해보세요.</p>
        </div>
      )}
    </div>
  );
};

export default KeywordExtraction;
