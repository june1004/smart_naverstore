import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Lightbulb, TrendingUp, Target, ShieldCheck } from "lucide-react";

const SalesAdvisor = () => {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm border border-[var(--brand-border)] bg-white rounded-xl">
        <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            매출 관리 & 상승 제안
          </CardTitle>
          <CardDescription className="text-slate-100">
            스토어 운영에서 “매출이 오르는 행동”을 빠르게 실행할 수 있도록 체크리스트와 제안 섹션을 제공합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg-start)]">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Target className="h-4 w-4 text-[#0F4C5C]" />
                오늘의 액션
              </div>
              <p className="text-sm text-slate-600 mt-2">
                상품명/태그/상세페이지를 “타겟키워드 기준”으로 정렬하고, 상위 노출 가능 키워드로 빠르게 교체하세요.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-[#0F4C5C]/30 text-[#0F4C5C] bg-white">
                  SEO 반영
                </Badge>
                <Badge variant="outline" className="border-[#0F4C5C]/30 text-[#0F4C5C] bg-white">
                  태그 정리
                </Badge>
                <Badge variant="outline" className="border-[#0F4C5C]/30 text-[#0F4C5C] bg-white">
                  상세 개선
                </Badge>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                AI 추천(로드맵)
              </div>
              <p className="text-sm text-slate-600 mt-2">
                (다음 단계) 주문/유입/전환 데이터를 기반으로 “매출 상승 레버”를 자동 추천합니다.
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>- 유입 키워드 대비 상세페이지 미스매치 탐지</div>
                <div>- 경쟁 상품 대비 가격/혜택 포지션 점검</div>
                <div>- 리뷰 키워드 기반 FAQ/상세 개선안 생성</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                안전장치
              </div>
              <p className="text-sm text-slate-600 mt-2">
                변경 전/후를 기록하고, 되돌리기(롤백) 가능한 방식으로 “원클릭 반영”의 리스크를 줄입니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
                  변경 이력
                </Badge>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
                  Diff 비교
                </Badge>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
                  롤백
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-3">
            <div className="text-slate-700 font-semibold">추가 기능 제안(페이지 구성 후보)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                <div className="font-semibold text-slate-700 mb-1">1) 매출 대시보드(요약)</div>
                <div>- 기간별 매출/주문/객단가/전환율</div>
                <div>- 상위 상품/하락 상품 알림</div>
              </div>
              <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                <div className="font-semibold text-slate-700 mb-1">2) 키워드 → 상품 매핑</div>
                <div>- 키워드별 최적 상품 추천</div>
                <div>- 키워드 트렌드 변화에 따른 태그/상품명 자동 제안</div>
              </div>
              <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                <div className="font-semibold text-slate-700 mb-1">3) 고객 메모/CS 히스토리</div>
                <div>- 구매자별 메모/응대 기록</div>
                <div>- 반복 문의 TOP/FAQ 자동 생성</div>
              </div>
              <div className="p-4 rounded-xl border border-[#E2D9C8] bg-white">
                <div className="font-semibold text-slate-700 mb-1">4) 경쟁/시장 모니터링</div>
                <div>- 경쟁상품 가격/혜택 변화 감지</div>
                <div>- 카테고리 인기 키워드 자동 추적</div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" className="border-[#E2D9C8] bg-white hover:bg-slate-50 text-slate-700">
                (다음) 내 스토어 데이터 기반 제안 활성화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesAdvisor;


