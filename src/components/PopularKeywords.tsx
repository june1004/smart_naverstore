
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Hash } from "lucide-react";

interface KeywordData {
  rank: number;
  keyword: string;
  category?: string;
}

interface DailyKeywords {
  date: string;
  keywords: KeywordData[];
}

const PopularKeywords = () => {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [popularKeywords, setPopularKeywords] = useState<DailyKeywords[]>([]);

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

      for (let i = 0; i < 4; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const keywords: KeywordData[] = [];
        const sampleKeywords = [
          "멀티탭", "전동드릴", "차량용방향제", "라부부", "강아지골매트",
          "전자담배", "비데렌탈", "체중계", "안마의자", "라쿠부",
          "전자담배", "아이유cdp", "차량용방향제", "아이유풀집피씨dp", 
          "멀티탭", "비데렌탈", "체중계", "파인라이너", "안마의자",
          "스타벅스텀블러", "임팩드릴", "송플기", "안마의자", "체중계"
        ];

        for (let j = 0; j < 10; j++) {
          keywords.push({
            rank: j + 1,
            keyword: sampleKeywords[Math.floor(Math.random() * sampleKeywords.length)],
            category: categories[Math.floor(Math.random() * categories.length)]
          });
        }

        sampleData.push({
          date: date.toLocaleDateString('ko-KR', { 
            month: '2-digit', 
            day: '2-digit',
            weekday: 'short'
          }),
          keywords
        });
      }

      setPopularKeywords(sampleData);
    };

    generateSampleData();
  }, []);

  const filteredKeywords = popularKeywords.map(daily => ({
    ...daily,
    keywords: selectedCategory === "전체" 
      ? daily.keywords 
      : daily.keywords.filter(k => k.category === selectedCategory)
  }));

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

      {/* 인기 검색어 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredKeywords.map((daily, index) => (
          <Card key={index} className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
                {daily.date}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {daily.keywords.slice(0, 10).map((keyword, kidx) => (
                  <div 
                    key={kidx} 
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b last:border-b-0"
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
                      <div className="text-sm font-medium text-gray-900 truncate">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PopularKeywords;
