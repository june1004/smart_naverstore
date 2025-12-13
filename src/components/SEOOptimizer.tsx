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
import { Sparkles, Loader2, X, CheckCircle2, AlertCircle, FileText } from "lucide-react";
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
      const requestBody = {
        keyword: keyword || currentProductName,
        currentProductName: currentProductName || undefined,
        currentDetailContent: currentDetailContent || undefined,
        currentTags: currentTags && currentTags.length > 0 ? currentTags : undefined,
        category: category || undefined,
      };

      console.log('SEO 추천 요청:', { ...requestBody, currentDetailContentLength: currentDetailContent?.length });
      console.log('Supabase URL:', supabase.supabaseUrl);
      console.log('함수 호출: gemini-seo-recommend');

      const { data, error } = await supabase.functions.invoke('gemini-seo-recommend', {
        body: requestBody,
      });

      if (error) {
        console.error('Gemini API 오류 상세:', error);
        console.error('에러 상태:', error.status);
        console.error('에러 메시지:', error.message);
        console.error('에러 컨텍스트:', error.context);
        
        // 에러 응답 본문에서 상세 정보 추출 시도
        let errorDetails = error.message || 'SEO 추천 생성에 실패했습니다.';
        if (error.context?.body) {
          try {
            const parsedError = typeof error.context.body === 'string' 
              ? JSON.parse(error.context.body) 
              : error.context.body;
            if (parsedError.error) {
              errorDetails = parsedError.error;
            } else if (parsedError.details) {
              errorDetails = parsedError.details;
            }
          } catch (e) {
            console.error('에러 본문 파싱 실패:', e);
          }
        }
        
        let errorMessage = errorDetails;
        
        // 에러 응답에서 상세 정보 추출
        if (error.status === 404) {
          errorMessage = '함수를 찾을 수 없습니다. Edge Function이 배포되었는지 확인해주세요. 잠시 후 다시 시도해주세요.';
        } else if (error.status === 400) {
          errorMessage = `요청 오류: ${errorDetails}. 키워드와 필수 정보를 확인해주세요.`;
        } else if (error.status === 401) {
          errorMessage = '인증 오류: 로그인 상태를 확인해주세요.';
        } else if (error.status === 500) {
          errorMessage = `서버 오류: ${errorDetails}. Gemini API 키가 설정되어 있는지 확인하거나, Supabase 대시보드의 함수 로그를 확인해주세요.`;
        }
        
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('응답 데이터가 없습니다.');
      }

      if (!data.recommended_name || !Array.isArray(data.recommended_tags) || !data.modified_html) {
        console.error('응답 데이터 구조:', data);
        throw new Error('Gemini API 응답 형식이 올바르지 않습니다. 필수 필드가 누락되었습니다.');
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
      <Card className="border border-[#D4AF37]/20 bg-gradient-to-br from-white via-slate-50 to-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden">
        <CardHeader className="p-8 bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-100">
          <CardTitle className="text-2xl font-bold text-slate-700 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#0F4C5C] to-[#1a6b7a] rounded-lg shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            AI SEO 최적화 분석
          </CardTitle>
          <CardDescription className="text-slate-600 text-base mt-3 leading-relaxed">
            Gemini AI가 상품명, SEO 태그, 상세페이지를 분석하여 검색 최적화 제안을 제공합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="h-6 w-6 text-[#0F4C5C] animate-spin" />
                <span className="text-slate-700 font-medium">AI가 분석 중입니다...</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full h-16 bg-gradient-to-r from-[#0F4C5C] via-[#1a6b7a] to-[#0F4C5C] hover:from-[#1a6b7a] hover:via-[#0F4C5C] hover:to-[#1a6b7a] text-white text-lg font-semibold rounded-xl shadow-[0_4px_20px_rgba(15,76,92,0.3)] hover:shadow-[0_6px_30px_rgba(15,76,92,0.4)] transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
              <Sparkles className="h-5 w-5 relative z-10" />
              <span className="relative z-10">✨ Gemini AI 최적화 분석 시작</span>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 2: 검토 및 반영 모달 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#D4AF37]/30">
          <DialogHeader className="pb-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/50 to-white rounded-t-2xl -m-6 mb-0 p-6">
            <DialogTitle className="text-2xl font-bold text-slate-700 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#0F4C5C] to-[#1a6b7a] rounded-lg shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              AI 검색 최적화 제안 및 스토어 반영
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-base mt-3 leading-relaxed">
              AI가 제안한 내용을 검토하고 필요시 수정한 후 네이버 스마트스토어에 반영하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-6">
            {/* 상품명 섹션 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold text-slate-700">상품명</Label>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    현재 상품명
                  </Label>
                  <Input
                    value={currentProductName || "상품명이 없습니다"}
                    disabled
                    className="bg-slate-50/80 border-slate-200 text-slate-500 rounded-xl h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></div>
                    AI 추천 상품명
                    <Badge variant="outline" className="border-[#D4AF37]/50 text-[#D4AF37] text-xs bg-[#D4AF37]/5 ml-auto">
                      NEW
                    </Badge>
                  </Label>
                  <div className="relative">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="border-2 border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 rounded-xl h-11 bg-white shadow-sm"
                      placeholder="AI 추천 상품명"
                    />
                    {editedName !== currentProductName && (
                      <div className="absolute -right-2 -top-2">
                        <div className="w-3 h-3 bg-[#D4AF37] rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SEO 태그 섹션 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold text-slate-700">SEO 태그</Label>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    현재 태그
                  </Label>
                  <div className="flex flex-wrap gap-2 min-h-[80px] p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                    {currentTags.length > 0 ? (
                      currentTags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="bg-slate-200/80 text-slate-600 border border-slate-300/50 rounded-full px-3 py-1"
                        >
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400 text-sm italic w-full text-center py-4">태그가 없습니다</span>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></div>
                    AI 추천 태그
                    <Badge variant="outline" className="border-[#D4AF37]/50 text-[#D4AF37] text-xs bg-[#D4AF37]/5 ml-auto">
                      {editedTags.length}/10
                    </Badge>
                  </Label>
                  <div className="flex flex-wrap gap-2 min-h-[80px] p-4 bg-gradient-to-br from-white to-[#D4AF37]/5 rounded-xl border-2 border-[#D4AF37]/40 shadow-sm">
                    {editedTags.map((tag, index) => {
                      const isNew = !currentTags.includes(tag);
                      return (
                        <Badge
                          key={index}
                          variant="outline"
                          className={`bg-white border-2 ${
                            isNew 
                              ? 'border-[#D4AF37]/60 text-[#0F4C5C] shadow-sm' 
                              : 'border-slate-300 text-slate-600'
                          } rounded-full px-3 py-1 pr-1 group hover:border-[#D4AF37]/80 transition-colors`}
                        >
                          {tag}
                          {isNew && (
                            <span className="ml-1 text-[#D4AF37] text-xs">●</span>
                          )}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 hover:bg-[#D4AF37]/20 rounded-full p-0.5 transition-colors"
                            aria-label={`${tag} 태그 제거`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {editedTags.length < 10 && (
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="태그 추가..."
                          className="w-28 h-8 text-xs border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 rounded-full"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const value = e.currentTarget.value.trim();
                              if (value) {
                                handleAddTag(value);
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 상세페이지 HTML 섹션 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold text-slate-700">상세페이지</Label>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 rounded-xl p-1.5 border border-slate-200">
                  <TabsTrigger 
                    value="preview" 
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#0F4C5C] font-medium"
                  >
                    미리보기
                  </TabsTrigger>
                  <TabsTrigger 
                    value="code" 
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#0F4C5C] font-medium"
                  >
                    소스코드
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-6">
                  <div className="border-2 border-slate-200 rounded-xl p-6 bg-white min-h-[400px] max-h-[500px] overflow-y-auto shadow-inner">
                    {editedHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: editedHtml }}
                        className="prose prose-sm max-w-none prose-headings:text-slate-700 prose-p:text-slate-600 prose-a:text-[#0F4C5C] prose-strong:text-slate-700"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <FileText className="h-12 w-12 mb-3 opacity-50" />
                        <span className="text-sm">미리보기 내용이 없습니다</span>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="code" className="mt-6">
                  <div className="relative">
                    <Textarea
                      value={editedHtml}
                      onChange={(e) => setEditedHtml(e.target.value)}
                      className="font-mono text-sm min-h-[400px] max-h-[500px] border-2 border-slate-200 focus:border-[#D4AF37]/40 focus:ring-2 focus:ring-[#D4AF37]/20 rounded-xl bg-slate-50/50 resize-none"
                      placeholder="HTML 소스코드를 입력하세요..."
                    />
                    <div className="absolute top-3 right-3 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded border border-slate-200">
                      {editedHtml.length}자
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200/80 pt-6 mt-6 bg-gradient-to-r from-slate-50/50 to-white -m-6 -mb-0 p-6 rounded-b-2xl">
            <div className="flex items-center justify-between w-full gap-4">
              <div className="text-sm text-slate-500">
                {productId ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    상품 ID: <span className="font-mono font-semibold text-slate-700">{productId}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    상품 ID를 입력해주세요
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl px-6"
                >
                  취소
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={isApplying || !productId}
                  className="bg-gradient-to-r from-[#0F4C5C] via-[#1a6b7a] to-[#0F4C5C] hover:from-[#1a6b7a] hover:via-[#0F4C5C] hover:to-[#1a6b7a] text-white rounded-xl px-8 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  {isApplying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin relative z-10" />
                      <span className="relative z-10">반영 중...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 relative z-10" />
                      <span className="relative z-10">네이버 스토어 반영하기</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SEOOptimizer;

