import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SEOOptimizer from "@/components/SEOOptimizer";
import { Package, Tag, FileText } from "lucide-react";

const SEOOptimization = () => {
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [detailContent, setDetailContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
      <div className="container mx-auto max-w-6xl space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-700">SEO 자동 최적화</h1>
          <p className="text-slate-600 text-lg">
            Gemini AI가 상품 정보를 분석하여 검색 최적화 제안을 제공합니다
          </p>
        </div>

        {/* 상품 정보 입력 섹션 */}
        <Card className="border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="productId" className="text-slate-700">
                  네이버 상품 ID (originProductId) *
                </Label>
                <Input
                  id="productId"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="예: 12345678"
                  className="border-slate-200 focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyword" className="text-slate-700">
                  타겟 키워드 *
                </Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 무선 이어폰"
                  className="border-slate-200 focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName" className="text-slate-700 flex items-center gap-2">
                <Package className="h-4 w-4" />
                현재 상품명
              </Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="현재 상품명을 입력하세요"
                className="border-slate-200 focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-slate-700">
                카테고리
              </Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: 디지털/가전 > 오디오/영상 > 이어폰"
                className="border-slate-200 focus:border-[#0F4C5C] focus:ring-[#0F4C5C]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-slate-700 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                현재 태그 ({tags.length}/10)
              </Label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[60px]">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-300 rounded-full text-sm text-slate-700"
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
                      className="w-32 h-8 text-sm border-slate-200"
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
              </Label>
              <Textarea
                id="detailContent"
                value={detailContent}
                onChange={(e) => setDetailContent(e.target.value)}
                placeholder="상세페이지 HTML을 입력하세요 (선택사항)"
                className="min-h-[200px] border-slate-200 focus:border-[#0F4C5C] focus:ring-[#0F4C5C] font-mono text-sm"
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

