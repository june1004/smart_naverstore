
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RelatedKeyword {
  relKeyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  plAvgDepth: number;
  compIdx: string;
}

interface AutocompleteKeyword {
  keyword: string;
  searchVolume: number;
  competition: string;
}

interface KeywordData {
  relatedKeywords: RelatedKeyword[];
  autocompleteKeywords: AutocompleteKeyword[];
}

const KeywordExtraction = () => {
  const [keyword, setKeyword] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['keyword-extraction', keyword],
    queryFn: async () => {
      if (!keyword.trim()) return null;
      
      const { data, error } = await supabase.functions.invoke('naver-keyword-extraction', {
        body: { keyword: keyword.trim() }
      });

      if (error) {
        console.error('키워드 추출 오류:', error);
        throw new Error(error.message || '키워드 추출에 실패했습니다.');
      }

      return data as KeywordData;
    },
    enabled: false
  });

  const handleSearch = () => {
    if (!keyword.trim()) {
      toast.error("검색할 키워드를 입력해주세요.");
      return;
    }
    setSearchTriggered(true);
    refetch();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const getCompetitionBadge = (competition: string) => {
    const colors = {
      '높음': 'bg-red-100 text-red-800',
      '중간': 'bg-yellow-100 text-yellow-800', 
      '낮음': 'bg-green-100 text-green-800'
    };
    return colors[competition as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* 검색 입력 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            키워드 추출 검색
          </CardTitle>
          <CardDescription>
            검색 키워드를 입력하면 관련 키워드와 자동완성 키워드를 추출해드립니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="키워드를 입력하세요 (예: 화장품, 운동화)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isLoading}
              className="px-6"
            >
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? '검색 중...' : '검색'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 결과 표시 */}
      {searchTriggered && (
        <div className="space-y-6">
          {error && (
            <Card className="border-red-200">
              <CardContent className="pt-6">
                <p className="text-red-600">오류: {error.message}</p>
              </CardContent>
            </Card>
          )}

          {data && (
            <Tabs defaultValue="related" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="related" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  통합연관 키워드 ({data.relatedKeywords?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="autocomplete" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  자동완성 키워드 ({data.autocompleteKeywords?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="related" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>통합연관 키워드</CardTitle>
                    <CardDescription>
                      "{keyword}"와 관련된 키워드들과 월간 검색량 정보입니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.relatedKeywords && data.relatedKeywords.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>키워드</TableHead>
                            <TableHead className="text-right">PC 월간검색량</TableHead>
                            <TableHead className="text-right">모바일 월간검색량</TableHead>
                            <TableHead className="text-right">총 검색량</TableHead>
                            <TableHead className="text-right">경쟁지수</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.relatedKeywords.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {item.relKeyword}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(item.monthlyPcQcCnt)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(item.monthlyMobileQcCnt)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatNumber(item.monthlyPcQcCnt + item.monthlyMobileQcCnt)}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.compIdx}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        연관 키워드 데이터가 없습니다.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="autocomplete" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>자동완성 키워드</CardTitle>
                    <CardDescription>
                      "{keyword}" 검색 시 자동완성되는 키워드들과 인사이트 정보입니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.autocompleteKeywords && data.autocompleteKeywords.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>키워드</TableHead>
                            <TableHead className="text-right">검색량</TableHead>
                            <TableHead className="text-center">경쟁도</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.autocompleteKeywords.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {item.keyword}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(item.searchVolume)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={getCompetitionBadge(item.competition)}>
                                  {item.competition}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        자동완성 키워드 데이터가 없습니다.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
};

export default KeywordExtraction;
