import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ParsedCategory {
  id: string;
  category_id: string;
  category_name: string;
  large_category: string;
  medium_category: string;
  small_category: string;
  smallest_category: string;
  category_level: number;
  category_path: string;
  is_active: boolean;
  created_at: string;
}

type SortField = 'category_id' | 'category_name' | 'category_hierarchy' | 'category_path' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface CategoryListTableProps {
  categories: ParsedCategory[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

const CategoryListTable = ({ categories, sortField, sortDirection, onSort }: CategoryListTableProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleCategoryClick = (category: ParsedCategory) => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "카테고리별 인기검색어를 보려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 카테고리 정보를 로컬스토리지에 저장
    const categoryInfo = {
      categoryId: category.category_id,
      categoryName: category.category_path || category.category_name,
      categoryPath: category.category_path
    };
    
    localStorage.setItem('selectedCategory', JSON.stringify(categoryInfo));
    
    // 통합검색어 트렌드 탭으로 이동 (분야별 인기검색어)
    const tabTriggers = document.querySelectorAll('[role="tab"]');
    const trendTab = Array.from(tabTriggers).find(tab => 
      tab.getAttribute('data-value') === 'trend' || 
      tab.textContent?.includes('통합검색어 트렌드')
    ) as HTMLElement;
    
    if (trendTab) {
      trendTab.click();
      
      // 약간의 딜레이 후 분야별 인기검색어 탭 클릭
      setTimeout(() => {
        const popularKeywordTab = document.querySelector('[value="popular"]') as HTMLElement;
        if (popularKeywordTab) {
          popularKeywordTab.click();
        }
      }, 100);
    }

    toast({
      title: "카테고리 선택됨",
      description: `${categoryInfo.categoryName} 카테고리의 인기검색어를 확인하세요.`,
    });
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => onSort('category_id')}
                className="flex items-center gap-2 p-0 h-auto font-medium"
              >
                카테고리 ID {getSortIcon('category_id')}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => onSort('category_hierarchy')}
                className="flex items-center gap-2 p-0 h-auto font-medium"
              >
                대분류 {getSortIcon('category_hierarchy')}
              </Button>
            </TableHead>
            <TableHead>중분류</TableHead>
            <TableHead>소분류</TableHead>
            <TableHead>세분류</TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => onSort('category_path')}
                className="flex items-center gap-2 p-0 h-auto font-medium"
              >
                카테고리 경로 {getSortIcon('category_path')}
              </Button>
            </TableHead>
            <TableHead>상태</TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => onSort('created_at')}
                className="flex items-center gap-2 p-0 h-auto font-medium"
              >
                등록일 {getSortIcon('created_at')}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow 
              key={category.id}
              className={user ? "cursor-pointer hover:bg-gray-50" : ""}
              onClick={() => handleCategoryClick(category)}
            >
              <TableCell className="font-mono text-sm font-medium">
                {category.category_id}
              </TableCell>
              <TableCell className="font-medium">
                {category.large_category || '-'}
              </TableCell>
              <TableCell>
                {category.medium_category || '-'}
              </TableCell>
              <TableCell>
                {category.small_category || '-'}
              </TableCell>
              <TableCell>
                {category.smallest_category || '-'}
              </TableCell>
              <TableCell className="text-sm max-w-xs">
                <div className="truncate" title={category.category_path}>
                  {category.category_path || '-'}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                  {category.is_active ? '활성' : '비활성'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {new Date(category.created_at).toLocaleDateString('ko-KR')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CategoryListTable;
