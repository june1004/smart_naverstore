
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ShoppingSearchFormProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
}

const ShoppingSearchForm = ({ keyword, onKeywordChange, onSearch, loading }: ShoppingSearchFormProps) => {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <Input
          placeholder="검색할 상품 키워드를 입력하세요 (예: 김치, 마스크, 스마트폰 등)"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          className="h-12 text-lg"
        />
      </div>
      <Button 
        onClick={onSearch} 
        disabled={loading}
        className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
      >
        <Search className="h-4 w-4 mr-2" />
        {loading ? "검색중..." : "검색"}
      </Button>
    </div>
  );
};

export default ShoppingSearchForm;
