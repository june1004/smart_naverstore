import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Monitor, Smartphone } from "lucide-react";

interface RelatedKeyword {
  keyword: string;
  searchKeyword: string;
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
  originalIndex: number;
}

interface KeywordDetailModalProps {
  keyword: RelatedKeyword | null;
  isOpen: boolean;
  onClose: () => void;
}

const KeywordDetailModal = ({ keyword, isOpen, onClose }: KeywordDetailModalProps) => {
  if (!keyword) return null;

  // 월별 검색수 추이 더미 데이터 (실제로는 API에서 가져와야 함)
  const monthlyTrendData = [
    { month: '2024-06', desktop: keyword.monthlyPcSearchCount * 0.8, mobile: keyword.monthlyMobileSearchCount * 0.9 },
    { month: '2024-07', desktop: keyword.monthlyPcSearchCount * 0.7, mobile: keyword.monthlyMobileSearchCount * 0.8 },
    { month: '2024-08', desktop: keyword.monthlyPcSearchCount * 0.9, mobile: keyword.monthlyMobileSearchCount * 1.1 },
    { month: '2024-09', desktop: keyword.monthlyPcSearchCount * 0.85, mobile: keyword.monthlyMobileSearchCount * 1.05 },
    { month: '2024-10', desktop: keyword.monthlyPcSearchCount * 1.1, mobile: keyword.monthlyMobileSearchCount * 1.2 },
    { month: '2024-11', desktop: keyword.monthlyPcSearchCount * 1.05, mobile: keyword.monthlyMobileSearchCount * 1.15 },
    { month: '2024-12', desktop: keyword.monthlyPcSearchCount * 0.95, mobile: keyword.monthlyMobileSearchCount * 1.3 },
    { month: '2025-01', desktop: keyword.monthlyPcSearchCount * 0.75, mobile: keyword.monthlyMobileSearchCount * 1.1 },
    { month: '2025-02', desktop: keyword.monthlyPcSearchCount * 0.8, mobile: keyword.monthlyMobileSearchCount * 0.95 },
    { month: '2025-03', desktop: keyword.monthlyPcSearchCount * 1.0, mobile: keyword.monthlyMobileSearchCount * 1.0 },
  ];

  // 성별/연령별 더미 데이터
  const genderAgeData = [
    { category: '남성', desktop: 55, mobile: 27 },
    { category: '여성', desktop: 45, mobile: 73 }
  ];

  const ageGroupData = [
    { age: '0-12', desktop: 2, mobile: 3 },
    { age: '13-17', desktop: 8, mobile: 12 },
    { age: '18-24', desktop: 12, mobile: 8 },
    { age: '25-29', desktop: 15, mobile: 25 },
    { age: '30-39', desktop: 52, mobile: 37 },
    { age: '40-49', desktop: 20, mobile: 12 },
    { age: '50+', desktop: 17, mobile: 20 }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-600">
            키워드: {keyword.keyword}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 정보 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">월간 검색수</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">PC</span>
                    </div>
                    <span className="font-semibold">{keyword.monthlyPcSearchCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-green-500" />
                      <span className="text-sm">모바일</span>
                    </div>
                    <span className="font-semibold">{keyword.monthlyMobileSearchCount.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">전체</span>
                      <span className="font-bold text-blue-600">{keyword.totalSearchCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">월평균 클릭수</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">PC</span>
                    </div>
                    <span className="font-semibold">{keyword.monthlyAvgPcClick.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-green-500" />
                      <span className="text-sm">모바일</span>
                    </div>
                    <span className="font-semibold">{keyword.monthlyAvgMobileClick.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">전체</span>
                      <span className="font-bold text-green-600">{keyword.totalAvgClick.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">기타 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">클릭률</span>
                    <span className="font-semibold">{keyword.avgCtr.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">경쟁정도</span>
                    <Badge 
                      variant={keyword.competition === '높음' ? 'destructive' : 
                              keyword.competition === '중간' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {keyword.competition}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">월평균노출광고수</span>
                    <span className="font-semibold">{keyword.plAvgDepth}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 월별 검색수 추이 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">월별 검색수 추이 (최근 1년)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="desktop" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="PC"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mobile" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="모바일"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 검색자 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">월간 검색수 사용자 통계 (최근일 기준) / 성별(%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={genderAgeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="desktop" fill="#3b82f6" name="PC" />
                    <Bar dataKey="mobile" fill="#10b981" name="모바일" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">월간 검색수 사용자 통계 (최근일 기준) / 나이대(%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ageGroupData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="desktop" fill="#3b82f6" name="PC" />
                    <Bar dataKey="mobile" fill="#10b981" name="모바일" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 주의사항 */}
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 네이버에서 해당 키워드를 검색한 횟수의 추정 횟수를 월별로 확인하세요. (통합검색 기준)</li>
                <li>• 사용자 정보가 확인된 검색에 대한 통계이므로 활용시 유의하십시오.</li>
                <li>• 사용자 통계는 일정수준 이상의 검색수가 있는 키워드의 월별 제공 기간 가능합니다.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeywordDetailModal;
