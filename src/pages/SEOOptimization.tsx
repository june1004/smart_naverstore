import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEOOptimizer from "@/components/SEOOptimizer";
import { Package, Tag, FileText, Search, Loader2, Sparkles, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// URL에서 상품ID 추출 함수
const extractProductIdFromUrl = (urlOrId: string): string | null => {
  if (!urlOrId) return null;
  const raw = urlOrId.trim();
  
  // 숫자만 있는 경우 (상품ID)
  if (/^\d+$/.test(raw)) {
    return raw;
  }
  
  // URL에서 상품ID 추출
  // 네이버 스마트스토어 URL 패턴: https://smartstore.naver.com/.../products/{productId}
  const urlPatterns = [
    /products\/(\d+)/,
    /product\/(\d+)/,
    /originProductId=(\d+)/,
    /id=(\d+)/,
  ];
  
  for (const pattern of urlPatterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 추가 지원: "스토어명/상품번호" 형태 (예: nanumlab/10713170202)
  const storeSlashId = raw.match(/\/(\d{5,})$/);
  if (storeSlashId?.[1]) return storeSlashId[1];

  // 마지막 수단: 문자열 내 연속 숫자(길이 5 이상) 추출
  // (주의: 다른 숫자가 섞여 있을 수 있어 너무 짧은 숫자는 제외)
  const anyLongDigits = raw.match(/(\d{5,})/);
  if (anyLongDigits?.[1]) return anyLongDigits[1];
  
  return null;
};

const SEOOptimization = () => {
  const [productIdOrUrl, setProductIdOrUrl] = useState("");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [detailContent, setDetailContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [recommendedKeywords, setRecommendedKeywords] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 상품 정보 자동 불러오기
  const handleLoadProduct = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "상품 정보를 불러오려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!productIdOrUrl.trim()) {
      toast({
        title: "상품ID 또는 URL을 입력해주세요",
        description: "네이버 상품ID 또는 상품 URL을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // URL에서 상품ID 추출
    const extractedId = extractProductIdFromUrl(productIdOrUrl.trim());
    if (!extractedId) {
      toast({
        title: "상품ID를 찾을 수 없습니다",
        description: "올바른 상품ID 또는 네이버 스마트스토어 URL을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingProduct(true);
    setProductId(extractedId);

    try {
      const { data, error } = await supabase.functions.invoke('naver-product-get', {
        body: { originProductId: extractedId }
      });

      if (error) {
        console.error('상품 정보 조회 오류 상세:', error);
        
        // 에러 상세 정보 추출
        let errorDetails = error.message || '상품 정보를 불러오는데 실패했습니다.';
        let errorSuggestion = '';
        let errorAttempts: unknown = null;

        // FunctionsHttpError인 경우 Response 객체에서 본문 추출 시도
        if (error.context && typeof error.context.json === 'function') {
          try {
            // 이미 본문이 읽혔는지 확인하기 어려우므로 clone() 시도 후 읽기
            const clone = error.context.clone();
            const body = await clone.json();
            
            // body 구조 예시:
            // { error: string, details: string|object, attempts?: Array<{name,status,body}> }
            if (body?.error) errorDetails = body.error;
            if (body?.message && !body?.error) errorDetails = body.message;

            if (body?.details) {
              const detailsText =
                typeof body.details === 'string' ? body.details : JSON.stringify(body.details, null, 2);
              errorDetails += ` (${detailsText})`;
            }

            if (body?.attempts) {
              errorAttempts = body.attempts;
              // 화면에서는 길 수 있으니 콘솔에 자세히 출력
              console.groupCollapsed('[naver-product-get] token attempts');
              console.log(body.attempts);
              console.groupEnd();

              // 사용자에게는 마지막 시도 결과만 짧게 보여주기
              try {
                const last = Array.isArray(body.attempts) ? body.attempts[body.attempts.length - 1] : null;
                if (last?.status) {
                  errorDetails += ` (마지막 시도 status=${last.status})`;
                }
              } catch {
                // ignore
              }
            }

            if (body?.searchDebugInfo) {
              console.groupCollapsed('[naver-product-get] product search debug');
              console.log(body.searchDebugInfo);
              console.groupEnd();
            }

            if (body?.suggestion) errorSuggestion = body.suggestion;
            
            console.log('에러 응답 본문:', body);
          } catch (e) {
            console.warn('에러 본문 파싱 실패 (JSON):', e);
            try {
              const clone = error.context.clone();
              const text = await clone.text();
              if (text) errorDetails = text;
            } catch (e2) {
               console.warn('에러 본문 파싱 실패 (Text):', e2);
            }
          }
        }

        let errorMessage = errorDetails;
        if (error.status === 400 || (error.context && error.context.status === 400)) {
          errorMessage = `요청 오류: ${errorDetails}`;
          if (!errorSuggestion) {
            errorSuggestion = '콘솔에 출력된 token attempts를 확인해주세요. (개발자도구 Console에서 `[naver-product-get] token attempts` 그룹을 펼치면 됩니다)';
          }
        } else if (error.status === 401 || (error.context && error.context.status === 401)) {
          errorMessage = '인증 오류: 네이버 커머스 API 키 권한이 없거나 만료되었습니다.';
        } else if (error.status === 404 || (error.context && error.context.status === 404)) {
          errorMessage = `상품을 찾을 수 없습니다: ${errorDetails}`;
        } else if (error.status === 500 || (error.context && error.context.status === 500)) {
          errorMessage = `서버 오류: ${errorDetails}`;
        }

        // 제안 사항이 있으면 추가
        if (errorSuggestion) {
          errorMessage += `\n💡 ${errorSuggestion}`;
        }

        // attempts가 있으면 추가 안내 (UI에 다 보여주긴 길어서 콘솔로 유도)
        if (errorAttempts) {
          errorMessage += `\n📌 (상세: 브라우저 콘솔의 token attempts 참고)`;
        }
        
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('상품 정보를 받지 못했습니다.');
      }

      // 불러온 정보로 상태 업데이트
      setProductName(data.productName || '');
      setCategory(data.categoryPath || data.category || '');
      setTags(data.tags || []);
      setDetailContent(data.detailContent || '');

      toast({
        title: "상품 정보 불러오기 완료",
        description: `'${data.productName}' 상품 정보를 불러왔습니다.`,
      });

      // 상품 정보를 불러온 후 키워드 추천 자동 실행
      if (data.productName) {
        setTimeout(() => {
          handleRecommendKeywords(data.productName, data.categoryPath || data.category, data.tags);
        }, 500);
      }

    } catch (error) {
      console.error('상품 정보 불러오기 오류:', error);
      toast({
        title: "상품 정보 불러오기 실패",
        description: error instanceof Error ? error.message : "상품 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProduct(false);
    }
  };

  // 키워드 추천
  const handleRecommendKeywords = async (name?: string, cat?: string, currentTags?: string[]) => {
    const targetProductName = name || productName;
    const targetCategory = cat || category;

    if (!targetProductName.trim()) {
      toast({
        title: "상품명이 필요합니다",
        description: "키워드 추천을 위해 상품명이 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingKeywords(true);

    try {
      const { data, error } = await supabase.functions.invoke('keyword-recommend', {
        body: {
          productName: targetProductName,
          category: targetCategory,
          categoryPath: targetCategory,
          currentTags: currentTags || tags,
        }
      });

      if (error) {
        console.error('키워드 추천 오류:', error);
        throw new Error(error.message || '키워드 추천에 실패했습니다.');
      }

      if (data && data.keywords && Array.isArray(data.keywords)) {
        setRecommendedKeywords(data.keywords);
        toast({
          title: "키워드 추천 완료",
          description: `${data.keywords.length}개의 키워드를 추천했습니다.`,
        });
      } else {
        throw new Error('키워드 추천 결과가 올바르지 않습니다.');
      }

    } catch (error) {
      console.error('키워드 추천 오류:', error);
      toast({
        title: "키워드 추천 실패",
        description: error instanceof Error ? error.message : "키워드 추천 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  // 추천 키워드 선택
  const handleSelectKeyword = (selectedKeyword: string) => {
    setKeyword(selectedKeyword);
    setRecommendedKeywords(recommendedKeywords.filter(k => k !== selectedKeyword));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F9F8] via-white to-[#E6F4F1] p-8">
      <div className="container mx-auto max-w-6xl space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-700">SEO 자동 최적화</h1>
          <p className="text-slate-600 text-lg">
            Gemini AI가 상품 정보를 분석하여 검색 최적화 제안을 제공합니다
          </p>
        </div>

        {/* 상품 정보 입력 섹션 */}
        <Card className="border border-[#E2D9C8] shadow-sm bg-white rounded-2xl">
          <CardHeader className="p-8">
            <CardTitle className="text-xl font-bold text-slate-700 flex items-center gap-2">
              <Package className="h-5 w-5 text-[#0F4C5C]" />
              상품 정보 입력
            </CardTitle>
            <CardDescription className="text-slate-600">
              최적화할 상품의 정보를 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            {/* 상품ID/URL 입력 및 불러오기 */}
            <div className="space-y-2">
              <Label htmlFor="productIdOrUrl" className="text-slate-700 flex items-center gap-2">
                <Package className="h-4 w-4" />
                네이버 상품 ID 또는 URL *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="productIdOrUrl"
                  value={productIdOrUrl}
                  onChange={(e) => setProductIdOrUrl(e.target.value)}
                  placeholder="예: 12345678 또는 https://smartstore.naver.com/.../products/12345678"
                  className="flex-1 border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLoadProduct();
                    }
                  }}
                />
                <Button
                  onClick={handleLoadProduct}
                  disabled={isLoadingProduct || !productIdOrUrl.trim()}
                  className="bg-[#0F4C5C] hover:bg-[#0a3d4a] text-white"
                >
                  {isLoadingProduct ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      불러오는 중...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      상품 정보 불러오기
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                상품ID 또는 네이버 스마트스토어 상품 URL을 입력하면 자동으로 상품 정보를 불러옵니다.
              </p>
            </div>

            {/* 불러온 상품 정보 표시 */}
            {productId && (
              <div className="p-4 bg-[#F0F9F8] border border-[#E2D9C8] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#0F4C5C]">불러온 상품 정보</span>
                  <Badge variant="outline" className="border-[#0F4C5C]/30 text-[#0F4C5C]">
                    ID: {productId}
                  </Badge>
                </div>
                {productName && (
                  <p className="text-sm text-slate-700 mt-1">상품명: {productName}</p>
                )}
                {category && (
                  <p className="text-sm text-slate-600 mt-1">카테고리: {category}</p>
                )}
              </div>
            )}

            {/* 타겟 키워드 입력 및 추천 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="keyword" className="text-slate-700 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  타겟 키워드 *
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecommendKeywords()}
                  disabled={isLoadingKeywords || !productName.trim()}
                  className="text-[#0F4C5C] border-[#0F4C5C]/30 hover:bg-[#0F4C5C]/10"
                >
                  {isLoadingKeywords ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      추천 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI 키워드 추천
                    </>
                  )}
                </Button>
              </div>
              <Input
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 무선 이어폰 (또는 AI 추천 키워드 선택)"
                className="border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
              />
              
              {/* 추천 키워드 표시 */}
              {recommendedKeywords.length > 0 && (
                <div className="mt-2 p-3 bg-[#FDF6E3] border border-[#E2D9C8] rounded-lg">
                  <p className="text-xs font-medium text-slate-700 mb-2">추천 키워드 (클릭하여 선택):</p>
                  <div className="flex flex-wrap gap-2">
                    {recommendedKeywords.map((kw, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer border-[#D4AF37]/40 text-[#0F4C5C] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] transition-colors"
                        onClick={() => handleSelectKeyword(kw)}
                      >
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName" className="text-slate-700 flex items-center gap-2">
                <Package className="h-4 w-4" />
                현재 상품명
                {productName && (
                  <Badge variant="outline" className="ml-auto text-xs border-green-300 text-green-700 bg-green-50">
                    자동 불러옴
                  </Badge>
                )}
              </Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="상품 정보를 불러오면 자동으로 입력됩니다"
                className="border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
                disabled={isLoadingProduct}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-slate-700 flex items-center gap-2">
                카테고리
                {category && (
                  <Badge variant="outline" className="ml-auto text-xs border-green-300 text-green-700 bg-green-50">
                    자동 불러옴
                  </Badge>
                )}
              </Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="상품 정보를 불러오면 자동으로 입력됩니다"
                className="border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
                disabled={isLoadingProduct}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-slate-700 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                현재 태그 ({tags.length}/10)
                {tags.length > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs border-green-300 text-green-700 bg-green-50">
                    자동 불러옴
                  </Badge>
                )}
              </Label>
              <div className="flex flex-wrap gap-2 p-3 bg-[#FDF6E3]/30 rounded-xl border border-[#E2D9C8] min-h-[60px]">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-[#E2D9C8] rounded-full text-sm text-slate-700"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-slate-100 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {tags.length < 10 && (
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="태그 추가..."
                      className="w-32 h-8 text-sm border-[#E2D9C8]"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-1 bg-[#0F4C5C] text-white rounded-lg text-sm hover:bg-[#1a6b7a] transition-colors"
                    >
                      추가
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detailContent" className="text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                상세페이지 HTML
                {detailContent && (
                  <Badge variant="outline" className="ml-auto text-xs border-green-300 text-green-700 bg-green-50">
                    자동 불러옴
                  </Badge>
                )}
              </Label>
              <Textarea
                id="detailContent"
                value={detailContent}
                onChange={(e) => setDetailContent(e.target.value)}
                placeholder="상품 정보를 불러오면 자동으로 입력됩니다 (선택사항)"
                className="min-h-[200px] border-[#E2D9C8] focus:border-[#0F4C5C] focus:ring-[#0F4C5C] font-mono text-sm"
                disabled={isLoadingProduct}
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO 최적화 컴포넌트 */}
        <SEOOptimizer
          productId={productId}
          currentProductName={productName}
          currentDetailContent={detailContent}
          currentTags={tags}
          keyword={keyword}
          category={category}
        />
      </div>
    </div>
  );
};

export default SEOOptimization;

