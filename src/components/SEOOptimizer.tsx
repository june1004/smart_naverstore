import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SEORecommendation {
  recommended_name: string;
  recommended_tags: string[];
  modified_html: string;
}

interface SEOOptimizerProps {
  productId?: string;
  currentProductName?: string;
  currentDetailContent?: string;
  currentTags?: string[];
  keyword?: string;
  category?: string;
}

const SEOOptimizer = ({
  productId,
  currentProductName = "",
  currentDetailContent = "",
  currentTags = [],
  keyword = "",
  category = "",
}: SEOOptimizerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [recommendation, setRecommendation] = useState<SEORecommendation | null>(null);
  
  // 편집 가능한 상태
  const [editedName, setEditedName] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [editedHtml, setEditedHtml] = useState("");
  
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAnalyze = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "SEO 최적화 기능을 사용하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!keyword && !currentProductName) {
      toast({
        title: "키워드 필요",
        description: "분석할 키워드 또는 상품명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setRecommendation(null);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-seo-recommend', {
        body: {
          keyword: keyword || currentProductName,
          currentProductName,
          currentDetailContent,
          currentTags,
          category,
        },
      });

      if (error) {
        console.error('Gemini API 오류:', error);
        throw new Error(error.message || 'SEO 추천 생성에 실패했습니다.');
      }

      if (!data || !data.recommended_name || !data.recommended_tags || !data.modified_html) {
        throw new Error('Gemini API 응답 형식이 올바르지 않습니다.');
      }

      setRecommendation(data);
      setEditedName(data.recommended_name);
      setEditedTags([...data.recommended_tags]);
      setEditedHtml(data.modified_html);
      setIsDialogOpen(true);

      toast({
        title: "분석 완료",
        description: "AI가 SEO 최적화 제안을 생성했습니다.",
      });

    } catch (error) {
      console.error('SEO 추천 오류:', error);
      toast({
        title: "분석 실패",
        description: error instanceof Error ? error.message : "SEO 추천 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddTag = (newTag: string) => {
    if (newTag.trim() && !editedTags.includes(newTag.trim()) && editedTags.length < 10) {
      setEditedTags([...editedTags, newTag.trim()]);
    }
  };

  const handleApply = async () => {
    if (!productId) {
      toast({
        title: "상품 ID 필요",
        description: "상품 ID가 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "로그인 필요",
        description: "스토어 반영을 위해 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);

    try {
      const { data, error } = await supabase.functions.invoke('naver-product-update', {
        body: {
          originProductId: productId,
          product: {
            name: editedName,
            detailContent: editedHtml,
            tags: editedTags,
          },
        },
      });

      if (error) {
        console.error('상품 업데이트 오류:', error);
        throw new Error(error.message || '상품 업데이트에 실패했습니다.');
      }

      toast({
        title: "반영 완료",
        description: "네이버 스마트스토어에 성공적으로 반영되었습니다.",
      });

      setIsDialogOpen(false);
      
      // 성공 후 상태 초기화
      setTimeout(() => {
        setRecommendation(null);
        setEditedName("");
        setEditedTags([]);
        setEditedHtml("");
      }, 500);

    } catch (error) {
      console.error('상품 업데이트 오류:', error);
      toast({
        title: "반영 실패",
        description: error instanceof Error ? error.message : "상품 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      {/* Step 1: 메인 트리거 섹션 */}
      <Card className="border-[#D4AF37]/20 bg-gradient-to-br from-slate-50 to-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl">
        <CardHeader className="p-8">
          <CardTitle className="text-2xl font-bold text-slate-700 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-[#0F4C5C]" />
            AI SEO 최적화 분석
          </CardTitle>
          <CardDescription className="text-slate-600 text-base mt-2">
            Gemini AI가 상품명, SEO 태그, 상세페이지를 분석하여 검색 최적화 제안을 제공합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            </div>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-[#0F4C5C] to-[#1a6b7a] hover:from-[#1a6b7a] hover:to-[#0F4C5C] text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3"
            >
              <Sparkles className="h-5 w-5" />
              {isLoading ? "분석 중..." : "✨ Gemini AI 최적화 분석 시작"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 2: 검토 및 반영 모달 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#D4AF37]/20">
          <DialogHeader className="pb-6 border-b border-slate-200">
            <DialogTitle className="text-2xl font-bold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-[#0F4C5C]" />
              AI 검색 최적화 제안 및 스토어 반영
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-base mt-2">
              AI가 제안한 내용을 검토하고 필요시 수정한 후 네이버 스마트스토어에 반영하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-6">
            {/* 상품명 섹션 */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-slate-700">상품명</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm text-slate-500">현재 상품명</Label>
                  <Input
                    value={currentProductName}
                    disabled
                    className="bg-slate-50 border-slate-200 text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-700 flex items-center gap-2">
                    AI 추천 상품명
                    <Badge variant="outline" className="border-[#D4AF37]/40 text-[#D4AF37] text-xs">
                      NEW
                    </Badge>
                  </Label>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="border-[#D4AF37]/40 focus:ring-[#D4AF37]/40 focus:ring-2"
                    placeholder="AI 추천 상품명"
                  />
                </div>
              </div>
            </div>

            {/* SEO 태그 섹션 */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-slate-700">SEO 태그</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm text-slate-500">현재 태그</Label>
                  <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {currentTags.length > 0 ? (
                      currentTags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-slate-200 text-slate-600">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400 text-sm">태그가 없습니다</span>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm text-slate-700 flex items-center gap-2">
                    AI 추천 태그
                    <Badge variant="outline" className="border-[#D4AF37]/40 text-[#D4AF37] text-xs">
                      {editedTags.length}/10
                    </Badge>
                  </Label>
                  <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-white rounded-xl border-2 border-[#D4AF37]/40">
                    {editedTags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-white border-[#D4AF37]/60 text-[#0F4C5C] pr-1"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:bg-[#D4AF37]/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {editedTags.length < 10 && (
                      <Input
                        placeholder="태그 추가..."
                        className="w-24 h-7 text-xs border-[#D4AF37]/40"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 상세페이지 HTML 섹션 */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-slate-700">상세페이지</Label>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-xl p-1">
                  <TabsTrigger value="preview" className="rounded-lg">미리보기</TabsTrigger>
                  <TabsTrigger value="code" className="rounded-lg">소스코드</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4">
                  <div className="border border-slate-200 rounded-xl p-6 bg-white min-h-[400px] max-h-[500px] overflow-y-auto">
                    {editedHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: editedHtml }}
                        className="prose prose-sm max-w-none"
                      />
                    ) : (
                      <div className="text-slate-400 text-center py-20">미리보기 내용이 없습니다</div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="code" className="mt-4">
                  <Textarea
                    value={editedHtml}
                    onChange={(e) => setEditedHtml(e.target.value)}
                    className="font-mono text-sm min-h-[400px] max-h-[500px] border-slate-200 focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/40"
                    placeholder="HTML 소스코드를 입력하세요..."
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-6">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="text-slate-600 hover:text-slate-900"
            >
              취소
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying || !productId}
              className="bg-gradient-to-r from-[#0F4C5C] to-[#1a6b7a] hover:from-[#1a6b7a] hover:to-[#0F4C5C] text-white rounded-xl px-8"
            >
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  반영 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  네이버 스토어 반영하기
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SEOOptimizer;

