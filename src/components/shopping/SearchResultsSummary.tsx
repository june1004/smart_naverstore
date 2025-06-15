
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { SearchHistory } from "@/types/shopping";

interface SearchResultsSummaryProps {
  searchHistory: SearchHistory;
  currentPage: number;
  totalPages: number;
  onDownloadExcel: () => void;
}

const SearchResultsSummary = ({ searchHistory, currentPage, totalPages, onDownloadExcel }: SearchResultsSummaryProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-1">
            <div className="text-sm text-gray-600">
              키워드: <span className="font-medium">{searchHistory.keyword}</span>
            </div>
            <div className="text-sm text-gray-600">
              마지막 조회: {searchHistory.searchTime}
            </div>
            <div className="text-sm text-gray-600">
              총 검색결과: {searchHistory.results.length}개 (페이지 {currentPage}/{totalPages})
            </div>
          </div>
          <Button onClick={onDownloadExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            엑셀다운로드
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchResultsSummary;
