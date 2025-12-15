import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Sparkles, Zap, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import UserProfile from "@/components/UserProfile";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (method: string, params: Record<string, any>) => Promise<void>;
    };
  }
}

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, hasActiveSubscription, hasStoreAddon } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingStoreAddon, setIsProcessingStoreAddon] = useState(false);

  const tossClientKey = (import.meta as any).env?.VITE_TOSS_CLIENT_KEY as string | undefined;

  const requestTossPayment = async (plan: "base" | "store_addon") => {
    if (!tossClientKey) {
      throw new Error("VITE_TOSS_CLIENT_KEY가 설정되지 않았습니다. (Vercel env 설정 필요)");
    }
    if (!window.TossPayments) {
      throw new Error("TossPayments SDK가 로드되지 않았습니다. (네트워크/스크립트 로드 확인)");
    }

    const { data, error } = await supabase.functions.invoke("toss-create-order", { body: { plan } });
    if (error) throw error;

    const { orderId, amount, orderName, successUrl, failUrl, customerName } = data as any;
    const toss = window.TossPayments(tossClientKey);

    await toss.requestPayment("CARD", {
      amount,
      orderId,
      orderName,
      customerName: customerName ?? user?.email ?? "customer",
      successUrl,
      failUrl,
    });
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "구독을 시작하려면 먼저 로그인해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsProcessing(true);

    try {
      await requestTossPayment("base");

    } catch (error) {
      console.error("결제 오류:", error);
      toast({
        title: "결제 실패",
        description: (error as any)?.message || "결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStoreAddonPayment = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "추가 구독을 시작하려면 먼저 로그인해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!hasActiveSubscription) {
      toast({
        title: "기본 구독이 필요합니다",
        description: "스토어 관리는 ‘추가 구독’이므로 먼저 기본 구독을 활성화해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingStoreAddon(true);
    try {
      await requestTossPayment("store_addon");
    } catch (error) {
      console.error("추가 구독 결제 오류:", error);
      toast({
        title: "결제 실패",
        description: (error as any)?.message || "결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingStoreAddon(false);
    }
  };

  const features = [
    {
      icon: Sparkles,
      text: "무제한 SEO 분석",
      description: "Gemini AI 기반 키워드 및 상품 분석 무제한 사용"
    },
    {
      icon: Zap,
      text: "네이버 원클릭 연동",
      description: "네이버 커머스 API를 통한 실시간 상품 정보 수정"
    },
    {
      icon: Shield,
      text: "AI 상세페이지 최적화",
      description: "네이버 정책 준수 자동 HTML 변환 및 최적화"
    },
    {
      text: "우선 고객 지원",
      description: "전담 지원팀의 빠른 응답"
    },
    {
      text: "고급 분석 리포트",
      description: "상세한 트렌드 분석 및 경쟁사 비교 리포트"
    },
    {
      text: "API 웹훅 연동",
      description: "자동화를 위한 API 및 웹훅 기능"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--brand-bg-start)] via-white to-[var(--brand-bg-end)]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-[var(--brand-border)]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" showText={true} />
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-slate-700 hover:text-[var(--brand-primary)]"
              >
                홈
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-slate-700 hover:text-[var(--brand-primary)]"
              >
                대시보드
              </Button>
              <UserProfile />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-24 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <Badge variant="outline" className="border-[var(--brand-primary)]/30 text-[var(--brand-primary)] mb-4">
            간단한 가격
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-700 mb-4 tracking-tight">
            모든 기능을 <span className="text-[var(--brand-primary)]">한 곳에서</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            월간 구독으로 모든 프리미엄 기능을 무제한으로 사용하세요
          </p>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Base subscription */}
          <Card className="bg-white border-2 border-[var(--brand-border)] shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden relative">
            {/* Premium Badge */}
            <div className="absolute top-6 right-6">
              <Badge className="bg-gradient-to-r from-[var(--brand-gold)] to-[var(--brand-gold-2)] text-[var(--brand-primary)] border-0 px-3 py-1">
                기본 구독
              </Badge>
            </div>

            <CardHeader className="p-8 pb-6 text-center border-b border-[var(--brand-border)]/50">
              <CardTitle className="text-3xl font-bold text-slate-700 mb-2">
                Pro Seller Plan
              </CardTitle>
              <CardDescription className="text-slate-600 text-base">
                전문 셀러를 위한 올인원 솔루션
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8">
              {/* Price */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-[var(--brand-primary)]">₩10,000</span>
                  <span className="text-xl text-slate-600">/ 월</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">연간 결제 시 20% 할인</p>
              </div>

              {/* Features List */}
              <div className="space-y-4 mb-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#FDF6E3]/50 transition-colors"
                  >
                    <CheckCircle2 className="h-5 w-5 text-[var(--brand-gold)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-slate-700 flex items-center gap-2">
                        {feature.icon && <feature.icon className="h-4 w-4 text-[var(--brand-primary)]" />}
                        {feature.text}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing || hasActiveSubscription}
                size="lg"
                className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-3)] text-white text-lg font-semibold py-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    처리 중...
                  </>
                ) : hasActiveSubscription ? (
                  <>현재 이용 중</>
                ) : (
                  <>
                    구독하고 시작하기
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              {/* Additional Info */}
              <p className="text-center text-sm text-slate-500 mt-6">
                언제든지 취소 가능 · 첫 달 무료 체험
              </p>
            </CardContent>
          </Card>

          {/* Store management add-on */}
          <Card className="bg-white border border-[var(--brand-border)] shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden relative">
            <div className="absolute top-6 right-6">
              <Badge variant="outline" className="border-[var(--brand-gold)]/40 text-[var(--brand-primary)]">
                추가 구독(애드온)
              </Badge>
            </div>
            <CardHeader className="p-8 pb-6 text-center border-b border-[var(--brand-border)]/50">
              <CardTitle className="text-2xl font-bold text-slate-700 mb-2">
                Store Manager Add-on
              </CardTitle>
              <CardDescription className="text-slate-600 text-base">
                스토어관리(상품 수정/주문·결제/고객 저장소/폴링)를 활성화합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold text-[var(--brand-primary)]">₩20,000</span>
                  <span className="text-lg text-slate-600">/ 월</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">기본 구독이 필요합니다</p>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  "상품명·태그·상세페이지(HTML) 수정",
                  "주문/결제 조회 및 자동 고객 저장",
                  "전화/이메일 마스킹 방지용 매일 폴링(기본 7일)",
                  "CS용 고객 저장소 관리(중복 갱신 정책)",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#FDF6E3]/50 transition-colors">
                    <CheckCircle2 className="h-5 w-5 text-[var(--brand-gold)] flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-700">{t}</div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleStoreAddonPayment}
                disabled={isProcessingStoreAddon || hasStoreAddon}
                size="lg"
                className="w-full bg-white border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white text-lg font-semibold py-6 rounded-xl transition-all duration-300"
              >
                {isProcessingStoreAddon ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    처리 중...
                  </>
                ) : hasStoreAddon ? (
                  <>현재 이용 중</>
                ) : (
                  <>추가 구독 신청</>
                )}
              </Button>

              <p className="text-center text-sm text-slate-500 mt-6">
                마스킹되기 전에 고객 정보를 선저장합니다
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-3xl mx-auto mt-16"
        >
          <h2 className="text-2xl font-bold text-slate-700 mb-8 text-center">자주 묻는 질문</h2>
          <div className="space-y-4">
            {[
              {
                q: "결제는 어떻게 진행되나요?",
                a: "토스페이먼츠를 통한 안전한 카드 결제를 지원합니다. 매월 자동으로 결제됩니다."
              },
              {
                q: "언제든지 취소할 수 있나요?",
                a: "네, 언제든지 구독을 취소할 수 있으며, 취소 후에도 결제일까지는 서비스를 이용할 수 있습니다."
              },
              {
                q: "첫 달 무료 체험이 있나요?",
                a: "네, 첫 달은 무료로 모든 기능을 체험해보실 수 있습니다."
              }
            ].map((faq, index) => (
              <Card key={index} className="bg-white border border-[var(--brand-border)] shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-700 mb-2">{faq.q}</h3>
                  <p className="text-slate-600 text-sm">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;

