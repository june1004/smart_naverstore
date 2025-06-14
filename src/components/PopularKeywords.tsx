
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, TrendingUp, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PopularKeyword {
  keyword: string;
  rank: number;
  ratio: number;
}

const PopularKeywords = () => {
  const [popularKeywords, setPopularKeywords] = useState<PopularKeyword[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // 선택된 카테고리 정보 로드
  useEffect(() => {
    const storedCategory = localStorage.getItem('selectedCategory');
    if (storedCategory) {
      const categoryInfo = JSON.parse(storedCategory);
      setSelectedCategory(categoryInfo.categoryId);
      setSelectedCategoryInfo(categoryInfo);
      
      // 현재 날짜와 일주일 전 날짜 설정
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      setEndDate(formatDate(today));
      setStartDate(formatDate(lastWeek));
      
      toast({
        title: "카테고리 자동 선택",
        description: `${categoryInfo.categoryName} 카테고리가 자동으로 선택되었습니다.`,
      });
      
      // 로컬스토리지에서 제거 (한 번만 사용)
      localStorage.removeItem('selectedCategory');
    }
  }, [toast]);

  // 인증되지 않은 사용자 체크
  useEffect(() => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "분야별 인기검색어 기능을 사용하려면 로그인해주세요.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const searchPopularKeywords = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "회원가입 또는 로그인 후 이용해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCategory) {
      toast({
        title: "카테고리를 선택해주세요",
        description: "분석할 카테고리를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('naver-popular-keywords', {
        body: { 
          category: selectedCategory,
          startDate,
          endDate,
          timeUnit: 'date'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setPopularKeywords(data.keywords || data);

      toast({
        title: "검색 완료",
        description: `카테고리별 인기검색어를 조회했습니다.`,
      });

    } catch (error) {
      console.error('인기검색어 조회 오류:', error);
      toast({
        title: "검색 실패",
        description: "인기검색어 조회 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = formatDate(new Date());
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekFormatted = formatDate(lastWeek);

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
              분야별 인기검색어 기능을 사용하려면 회원가입 또는 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 선택된 카테고리 정보 표시 */}
      {selectedCategoryInfo && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <Search className="h-4 w-4" />
              <span className="font-medium">선택된 카테고리</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              {selectedCategoryInfo.categoryName} (ID: {selectedCategoryInfo.categoryId})
            </p>
          </CardContent>
        </Card>
      )}

      {/* 검색 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            분야별 인기검색어
          </CardTitle>
          <CardDescription>
            특정 분야의 인기검색어를 조회합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!user}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50000000">패션의류</SelectItem>
                <SelectItem value="50000001">화장품/미용</SelectItem>
                <SelectItem value="50000002">디지털/가전</SelectItem>
                <SelectItem value="50000003">식품</SelectItem>
                <SelectItem value="50000004">스포츠/레저</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder={lastWeekFormatted}
              disabled={!user}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder={today}
              disabled={!user}
            />
            <Button 
              onClick={searchPopularKeywords} 
              disabled={loading || !user}
              className="bg-green-600 hover:bg-green-700"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? "검색중..." : "검색"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 검색 결과 */}
      {popularKeywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              인기검색어 목록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>순위</TableHead>
                  <TableHead>키워드</TableHead>
                  <TableHead>검색비율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popularKeywords.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="outline">{item.rank}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.keyword}</TableCell>
                    <TableCell>{item.ratio}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">인기검색어를 조회하고 있습니다...</p>
        </div>
      )}
    </div>
  );
};

export default PopularKeywords;
