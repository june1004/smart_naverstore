import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyword } from "@/contexts/KeywordContext";
import ShoppingSearch from "./ShoppingSearch";
import MonthlySearchStats from "./MonthlySearchStats";
import KeywordExtraction from "./KeywordExtraction";
import KeywordQuality from "./KeywordQuality";

const KeywordSearch = () => {
  const { user } = useAuth();
  const { sharedKeyword } = useKeyword();
  const [activeTab, setActiveTab] = useState("shopping");

  // 로그인하지 않은 사용자를 위한 안내 컴포넌트
  const LoginRequiredMessage = () => (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-6 text-center">
        <User className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-orange-700 mb-2">로그인이 필요한 기능입니다</h3>
        <p className="text-orange-600 mb-4">
          키워드 조회 기능을 사용하려면 회원가입 또는 로그인해주세요.
        </p>
        {sharedKeyword && (
          <div className="bg-white p-3 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-orange-700">
              <Search className="h-4 w-4" />
              <span className="font-medium">AI 자동분석에서 전달된 키워드:</span>
            </div>
            <p className="text-lg font-bold text-orange-800 mt-1">"{sharedKeyword}"</p>
            <p className="text-sm text-orange-600 mt-2">로그인 후 이 키워드로 상세 분석을 진행할 수 있습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 로그인하지 않은 경우 안내 메시지만 표시
  if (!user) {
    return (
      <div className="space-y-6">
        <LoginRequiredMessage />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI 자동분석에서 전달된 키워드 안내 */}
      {sharedKeyword && (
        <Alert>
          <Search className="h-4 w-4" />
          <AlertDescription>
            AI 자동분석에서 전달된 키워드 "<strong>{sharedKeyword}</strong>"로 상세 분석을 진행할 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="shopping">쇼핑검색</TabsTrigger>
          <TabsTrigger value="monthly">월간검색통계</TabsTrigger>
          <TabsTrigger value="extraction">키워드추출</TabsTrigger>
          <TabsTrigger value="quality">키워드 품질 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="shopping">
          <Card>
            <CardHeader>
              <CardTitle>네이버 쇼핑 검색</CardTitle>
              <CardDescription>
                키워드별 쇼핑 상품 정보와 판매 데이터를 분석합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShoppingSearch />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>월간 검색 통계</CardTitle>
              <CardDescription>
                키워드별 월간 검색량과 트렌드를 분석합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlySearchStats />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extraction">
          <Card>
            <CardHeader>
              <CardTitle>키워드 추출</CardTitle>
              <CardDescription>
                네이버 검색광고 API를 통해 연관키워드와 자동완성키워드를 추출합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KeywordExtraction />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>키워드 품질 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <KeywordQuality
                relatedKeywords={/* 연관키워드 데이터 전달 */ keywordData?.relatedKeywords || []}
                autocompleteKeywords={/* 자동완성키워드 데이터 통합 전달 */
                  Object.values(keywordData?.autocompleteKeywordsByKeyword || {}).flat()
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KeywordSearch;
