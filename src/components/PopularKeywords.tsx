
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Hash } from "lucide-react";
import KeywordDetailModal from "./KeywordDetailModal";

interface KeywordData {
  rank: number;
  keyword: string;
  category?: string;
  // 상세 정보를 위한 추가 필드들
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
}

interface DailyKeywords {
  date: string;
  displayDate: string;
  keywords: KeywordData[];
}

const PopularKeywords = () => {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [popularKeywords, setPopularKeywords] = useState<DailyKeywords[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 네이버 쇼핑 카테고리 (주요 카테고리만 선별)
  const categories = [
    "전체",
    "패션의류",
    "패션잡화", 
    "화장품/미용",
    "디지털/가전",
    "가구/인테리어",
    "생활/건강",
    "식품",
    "스포츠/레저",
    "자동차용품",
    "도서/음반/DVD",
    "완구/취미",
    "문구/오피스",
    "반려동물용품",
    "유아동의류",
    "유아동용품",
    "출산/육아",
    "여행/문화",
    "면세점"
  ];

  // 샘플 데이터 생성 (실제로는 API에서 가져와야 함)
  useEffect(() => {
    const generateSampleData = () => {
      const today = new Date();
      const sampleData: DailyKeywords[] = [];

      // 14, 13, 12, 11일 전 순서로 생성 후 역순으로 정렬 (11, 12, 13, 14일 순서)
      const daysBack = [14, 13, 12, 11];
      
      for (let i = 0; i < 4; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysBack[i]);
        
        const keywords: KeywordData[] = [];
        const baseSampleKeywords = [
          "멀티탭", "전동드릴", "차량용방향제", "라부부", "강아지골매트",
          "전자담배", "비데렌탈", "체중계", "안마의자", "라쿠부",
          "아이유cdp", "아이유풀집피씨dp", "파인라이너", "송플기",
          "스타벅스텀블러", "임팩드릴", "블루투스이어폰", "무선충전기",
          "에어프라이어", "로봇청소기", "가습기", "공기청정기", "매트리스"
        ];

        // 카테고리별로 다른 키워드 생성
        const getCategoryKeywords = (category: string) => {
          switch (category) {
            case "패션의류":
              return ["후드티", "청바지", "원피스", "코트", "니트", "셔츠", "치마", "자켓", "맨투맨", "가디건"];
            case "디지털/가전":
              return ["스마트폰", "노트북", "태블릿", "이어폰", "충전기", "케이스", "보조배터리", "스피커", "키보드", "마우스"];
            case "화장품/미용":
              return ["립스틱", "파운데이션", "마스카라", "아이섀도", "선크림", "토너", "세럼", "크림", "클렌징", "미스트"];
            case "식품":
              return ["원두", "차", "과자", "초콜릿", "견과류", "건강식품", "쌀", "라면", "김치", "반찬"];
            default:
              return baseSampleKeywords;
          }
        };

        const categoryKeywords = selectedCategory === "전체" ? baseSampleKeywords : getCategoryKeywords(selectedCategory);
        
        for (let j = 0; j < 10; j++) {
          const baseKeyword = categoryKeywords[j] || categoryKeywords[Math.floor(Math.random() * categoryKeywords.length)];
          
          keywords.push({
            rank: j + 1,
            keyword: baseKeyword,
            category: selectedCategory === "전체" ? categories[Math.floor(Math.random() * (categories.length - 1)) + 1] : selectedCategory,
            monthlyPcSearchCount: Math.floor(Math.random() * 50000) + 10000,
            monthlyMobileSearchCount: Math.floor(Math.random() * 150000) + 30000,
            totalSearchCount: 0,
            monthlyAvgPcClick: Math.floor(Math.random() * 5000) + 500,
            monthlyAvgMobileClick: Math.floor(Math.random() * 15000) + 2000,
            totalAvgClick: 0,
            monthlyAvgPcCtr: Math.random() * 10 + 5,
            monthlyAvgMobileCtr: Math.random() * 15 + 5,
            avgCtr: 0,
            competition: Math.random() > 0.6 ? "높음" : Math.random() > 0.3 ? "중간" : "낮음",
            competitionScore: Math.floor(Math.random() * 100),
            plAvgDepth: Math.floor(Math.random() * 8) + 3
          });
        }

        // 계산된 필드 업데이트
        keywords.forEach(keyword => {
          keyword.totalSearchCount = keyword.monthlyPcSearchCount + keyword.monthlyMobileSearchCount;
          keyword.totalAvgClick = keyword.monthlyAvgPcClick + keyword.monthlyAvgMobileClick;
          keyword.avgCtr = (keyword.monthlyAvgPcCtr + keyword.monthlyAvgMobileCtr) / 2;
        });

        sampleData.push({
          date: date.toLocaleDateString('ko-KR'),
          displayDate: date.toLocaleDateString('ko-KR', { 
            month: '2-digit', 
            day: '2-digit',
            weekday: 'short'
          }),
          keywords
        });
      }

      // 11, 12, 13, 14일 순서로 정렬 (역순)
      sampleData.reverse();
      setPopularKeywords(sampleData);
    };

    generateSampleData();
  }, [selectedCategory]);

  const filteredKeywords = popularKeywords.map(daily => ({
    ...daily,
    keywords: selectedCategory === "전체" 
      ? daily.keywords 
      : daily.keywords.filter(k => k.category === selectedCategory)
  }));

  const handleKeywordClick = (keyword: KeywordData) => {
    // Transform KeywordData to match KeywordDetailModal expectations
    const modalKeyword = {
      searchKeyword: keyword.keyword,
      originalIndex: keyword.rank - 1,
      monthlyPcSearchCount: keyword.monthlyPcSearchCount,
      monthlyMobileSearchCount: keyword.monthlyMobileSearchCount,
      totalSearchCount: keyword.totalSearchCount,
      monthlyAvgPcClick: keyword.monthlyAvgPcClick,
      monthlyAvgMobileClick: keyword.monthlyAvgMobileClick,
      totalAvgClick: keyword.totalAvgClick,
      monthlyAvgPcCtr: keyword.monthlyAvgPcCtr,
      monthlyAvgMobileCtr: keyword.monthlyAvgMobileCtr,
      avgCtr: keyword.avgCtr,
      competition: keyword.competition,
      competitionScore: keyword.competitionScore,
      plAvgDepth: keyword.plAvgDepth
    };
    setSelectedKeyword(modalKeyword);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            분야별 인기 검색어
          </CardTitle>
          <p className="text-purple-100 text-sm">
            네이버 쇼핑에서 가장 많이 검색되는 키워드를 분야별로 확인하세요
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <label className="text-sm font-semibold text-gray-700">카테고리 선택</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 인기 검색어 목록 (4일간) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredKeywords.map((daily, index) => (
          <Card key={index} className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
                {daily.displayDate}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {daily.keywords.slice(0, 10).map((keyword, kidx) => (
                  <div 
                    key={kidx} 
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b last:border-b-0 cursor-pointer"
                    onClick={() => handleKeywordClick(keyword)}
                  >
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${keyword.rank <= 3 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                        : keyword.rank <= 5
                        ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      {keyword.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate hover:text-blue-600">
                        {keyword.keyword}
                      </div>
                      {keyword.category && selectedCategory === "전체" && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {keyword.category}
                        </Badge>
                      )}
                    </div>
                    <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 정보 카드 */}
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-8 text-center">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">인기 검색어 활용 팁</h3>
          <div className="text-sm text-gray-500 space-y-2">
            <p>📈 상위 랭킹 키워드를 통해 시장 트렌드를 파악하세요</p>
            <p>🎯 카테고리별 인기 키워드로 상품 기획에 활용하세요</p>
            <p>⏰ 일별 변화를 추적하여 급상승 키워드를 놓치지 마세요</p>
            <p>💡 경쟁사 분석과 마케팅 전략 수립에 참고하세요</p>
            <p>🔍 키워드를 클릭하면 상세한 검색 통계를 확인할 수 있습니다</p>
          </div>
        </CardContent>
      </Card>

      {/* 키워드 상세 정보 모달 */}
      <KeywordDetailModal
        keyword={selectedKeyword}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default PopularKeywords;
