import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Zap, 
  Shield, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp,
  BarChart3,
  Lock,
  Rocket,
  Users,
  Award
} from "lucide-react";
import Logo from "@/components/Logo";
import UserProfile from "@/components/UserProfile";

const Landing = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const workflowRef = useRef(null);
  
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const featuresInView = useInView(featuresRef, { once: true, margin: "-100px" });
  const workflowInView = useInView(workflowRef, { once: true, margin: "-100px" });
  
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const handleGetStarted = () => {
    navigate("/dashboard");
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" showText={true} />
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-slate-700 hover:text-[#0F4C5C]"
              >
                대시보드
              </Button>
              <UserProfile />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F4C5C] via-[#0a3d4a] to-[#062e38] overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(212,175,55,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Floating Elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 right-20 w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-20 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl"
        />

        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5 }}
            >
              <Badge 
                variant="outline" 
                className="border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10 px-4 py-1.5 text-sm font-medium rounded-full"
              >
                For Smart Store Sellers
              </Badge>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight"
            >
              AI로 완성하는,
              <br />
              <span className="bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] bg-clip-text text-transparent">
                압도적인 상위 노출
              </span>
              <br />
              전략
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl md:text-2xl text-slate-200 leading-relaxed max-w-2xl mx-auto"
            >
              네이버 커머스 API와 Gemini AI가 귀하의 상품을 완벽하게 분석하고 수정합니다.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center justify-center gap-4 pt-4"
            >
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] hover:from-[#F4D03F] hover:to-[#D4AF37] text-[#0F4C5C] text-lg font-semibold px-8 py-6 rounded-xl shadow-[0_8px_30px_rgba(212,175,55,0.4)] hover:shadow-[0_12px_40px_rgba(212,175,55,0.5)] transition-all duration-300 group"
              >
                무료로 분석 시작하기
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>

            {/* Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              animate={heroInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="pt-16 perspective-1000"
            >
              <div className="relative transform-gpu">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F4C5C] to-transparent blur-3xl opacity-50"></div>
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                  <div className="bg-white rounded-lg p-4 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="h-20 bg-gradient-to-br from-[#0F4C5C] to-[#1a6b7a] rounded"></div>
                        <div className="h-20 bg-gradient-to-br from-[#D4AF37] to-[#F4D03F] rounded"></div>
                        <div className="h-20 bg-gradient-to-br from-slate-400 to-slate-500 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge variant="outline" className="border-[#0F4C5C]/30 text-[#0F4C5C] mb-4">
              핵심 기능
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-700 mb-4 tracking-tight">
              모든 것이 <span className="text-[#0F4C5C]">자동화</span>됩니다
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              복잡한 SEO 작업을 AI가 대신 처리하여 시간을 절약하고 매출을 극대화하세요
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Sparkles,
                title: "AI Deep Analysis",
                description: "Gemini 기반 키워드/SEO 정밀 분석으로 경쟁사보다 한 발 앞서가세요",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Zap,
                title: "One-Click Sync",
                description: "네이버 커머스 API를 통한 실시간 정보 수정. 클릭 한 번으로 모든 변경사항이 반영됩니다",
                color: "from-[#D4AF37] to-[#F4D03F]"
              },
              {
                icon: Shield,
                title: "Safe Guard",
                description: "네이버 정책을 준수하는 안전한 태그 및 HTML 자동 변환으로 안심하고 사용하세요",
                color: "from-[#0F4C5C] to-[#1a6b7a]"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <Card className="h-full bg-white border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 shadow-lg hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardHeader className="p-8 pb-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} p-3 mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-700 mb-2">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <CardDescription className="text-slate-600 text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section ref={workflowRef} className="py-24 bg-gradient-to-br from-[#0F4C5C] via-[#0a3d4a] to-[#062e38] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(45deg, rgba(212,175,55,0.1) 25%, transparent 25%), linear-gradient(-45deg, rgba(212,175,55,0.1) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(212,175,55,0.1) 75%), linear-gradient(-45deg, transparent 75%, rgba(212,175,55,0.1) 75%)`,
            backgroundSize: '60px 60px',
            backgroundPosition: '0 0, 0 30px, 30px -30px, -30px 0px'
          }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={workflowInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge variant="outline" className="border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10 mb-4">
              간단한 3단계
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              <span className="text-[#D4AF37]">3분</span>이면 시작할 수 있습니다
            </h2>
            <p className="text-xl text-slate-200 leading-relaxed">
              복잡한 설정 없이 바로 시작하세요
            </p>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "스토어 연동",
                description: "네이버 스마트스토어를 간단히 연결하세요",
                icon: Lock,
                color: "from-blue-500 to-cyan-500"
              },
              {
                step: "2",
                title: "AI 진단",
                description: "Gemini AI가 상품을 분석하고 최적화 제안을 생성합니다",
                icon: Sparkles,
                color: "from-purple-500 to-pink-500"
              },
              {
                step: "3",
                title: "매출 상승",
                description: "자동으로 반영된 최적화로 검색 순위가 상승하고 매출이 증가합니다",
                icon: TrendingUp,
                color: "from-[#D4AF37] to-[#F4D03F]"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={workflowInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative mb-12 last:mb-0"
              >
                {/* Timeline Line */}
                {index < 2 && (
                  <div className="absolute left-8 top-20 w-0.5 h-full bg-gradient-to-b from-[#D4AF37]/50 to-transparent"></div>
                )}

                <div className="flex items-start gap-6">
                  {/* Step Number & Icon */}
                  <div className="relative z-10">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} p-4 flex items-center justify-center shadow-xl`}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {item.step}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-2">
                    <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-200 text-lg leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Users, value: "1,000+", label: "활성 사용자" },
              { icon: BarChart3, value: "50%+", label: "평균 매출 증가" },
              { icon: Award, value: "99.9%", label: "서비스 가동률" },
              { icon: Rocket, value: "3분", label: "평균 설정 시간" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-[#0F4C5C] to-[#1a6b7a] mb-4 shadow-lg">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-[#0F4C5C] mb-2">{stat.value}</div>
                <div className="text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <Card className="bg-gradient-to-br from-[#0F4C5C] to-[#0a3d4a] border-[#D4AF37]/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden">
              <CardContent className="p-12">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                  지금 바로 경쟁사보다
                  <br />
                  <span className="text-[#D4AF37]">앞서가세요</span>
                </h2>
                <p className="text-xl text-slate-200 mb-8 leading-relaxed">
                  무료로 시작하고, 결과를 확인한 후 결정하세요
                </p>
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] hover:from-[#F4D03F] hover:to-[#D4AF37] text-[#0F4C5C] text-lg font-semibold px-8 py-6 rounded-xl shadow-[0_8px_30px_rgba(212,175,55,0.4)] hover:shadow-[0_12px_40px_rgba(212,175,55,0.5)] transition-all duration-300 group"
                >
                  무료로 시작하기
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo size="sm" showText={true} />
              <p className="mt-4 text-slate-400 text-sm leading-relaxed">
                AI 기반 네이버 스마트스토어 SEO 최적화 플랫폼
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">제품</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">기능</a></li>
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">가격</a></li>
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">업데이트</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">회사</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">소개</a></li>
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">블로그</a></li>
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">채용</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">법적</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">개인정보처리방침</a></li>
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">쿠키 정책</a></li>
              </ul>
            </div>
          </div>
          <Separator className="bg-slate-700 mb-8" />
          <div className="text-center text-sm text-slate-400">
            <p>&copy; 2025 Smart Naver Store. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

