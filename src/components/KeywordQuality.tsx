import React from "react";

interface RelatedKeyword {
  keyword: string;
  totalSearchCount: number;
  totalAvgClick: number;
  avgCtr: number;
  competitionScore: number;
  searchKeyword?: string;
  monthlyPcSearchCount?: number;
  monthlyMobileSearchCount?: number;
}

interface AutocompleteKeyword {
  keyword: string;
  totalSearchCount?: number;
  totalAvgClick?: number;
  avgCtr?: number;
  competitionScore?: number;
  searchKeyword?: string;
  monthlyPcSearchCount?: number;
  monthlyMobileSearchCount?: number;
}

interface Props {
  relatedKeywords: RelatedKeyword[];
  autocompleteKeywords: AutocompleteKeyword[];
}

// 품질 점수 계산 함수 (예시)
function calcQualityScore(k: RelatedKeyword | AutocompleteKeyword) {
  // 검색량, 클릭수, 클릭률, 경쟁도(낮을수록 가점) 종합 점수
  const searchScore = (k.totalSearchCount || 0) > 1000 ? 2 : (k.totalSearchCount || 0) > 100 ? 1 : 0;
  const clickScore = (k.totalAvgClick || 0) > 100 ? 2 : (k.totalAvgClick || 0) > 10 ? 1 : 0;
  const ctrScore = (k.avgCtr || 0) > 5 ? 2 : (k.avgCtr || 0) > 2 ? 1 : 0;
  const compScore = (k.competitionScore || 0) < 0.3 ? 2 : (k.competitionScore || 0) < 0.7 ? 1 : 0;
  return searchScore + clickScore + ctrScore + compScore;
}

function getGrade(score: number) {
  if (score >= 7) return "A";
  if (score >= 5) return "B";
  if (score >= 3) return "C";
  return "D";
}

const KeywordQuality: React.FC<Props> = ({ relatedKeywords, autocompleteKeywords }) => {
  // 통합 품질 데이터
  const allKeywords = [
    ...relatedKeywords.map(k => ({ ...k, type: "연관키워드" })),
    ...autocompleteKeywords.map(k => ({ ...k, type: "자동완성키워드" }))
  ];
  const qualityData = allKeywords.map(k => {
    const score = calcQualityScore(k);
    return {
      ...k,
      qualityScore: score,
      grade: getGrade(score)
    };
  });
  // 상위 우수 키워드
  const topKeywords = qualityData.sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-blue-700">키워드 품질 분석</h2>
      <div className="mb-4">
        <span className="font-semibold">상위 우수 키워드 추천:</span>
        <ul className="list-disc ml-6 mt-2">
          {topKeywords.map((k, i) => (
            <li key={i} className="text-green-700 font-medium">
              {k.keyword} <span className="text-gray-500">({k.type}, 점수: {k.qualityScore}, 등급: {k.grade})</span>
            </li>
          ))}
        </ul>
      </div>
      <table className="min-w-full border text-sm">
        <thead className="bg-blue-50">
          <tr>
            <th className="border px-2 py-1">구분</th>
            <th className="border px-2 py-1">키워드</th>
            <th className="border px-2 py-1">검색키워드</th>
            <th className="border px-2 py-1">월간검색수(PC)</th>
            <th className="border px-2 py-1">월간검색수(모바일)</th>
            <th className="border px-2 py-1">검색량</th>
            <th className="border px-2 py-1">클릭수</th>
            <th className="border px-2 py-1">클릭률(%)</th>
            <th className="border px-2 py-1">경쟁도</th>
            <th className="border px-2 py-1">품질점수</th>
            <th className="border px-2 py-1">등급</th>
          </tr>
        </thead>
        <tbody>
          {qualityData.map((k, i) => (
            <tr key={i}>
              <td className="border px-2 py-1">{k.type}</td>
              <td className="border px-2 py-1">{k.keyword}</td>
              <td className="border px-2 py-1">{k.searchKeyword ?? '-'}</td>
              <td className="border px-2 py-1 text-right">{k.monthlyPcSearchCount ?? '-'}</td>
              <td className="border px-2 py-1 text-right">{k.monthlyMobileSearchCount ?? '-'}</td>
              <td className="border px-2 py-1 text-right">{k.totalSearchCount ?? '-'}</td>
              <td className="border px-2 py-1 text-right">{(k.totalAvgClick ?? 0).toFixed(1)}</td>
              <td className="border px-2 py-1 text-right">{(k.avgCtr ?? 0).toFixed(2)}</td>
              <td className="border px-2 py-1 text-right">{k.competitionScore ?? '-'}</td>
              <td className="border px-2 py-1 text-center font-bold">{k.qualityScore}</td>
              <td className="border px-2 py-1 text-center font-bold text-blue-700">{k.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KeywordQuality; 