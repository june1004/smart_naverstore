
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CategoryInfo {
  name: string;
  code: string;
  level1: string;
  level2: string;
  level3: string;
  count: number;
  percentage: string;
  hasRealCategory?: boolean;
  realCategoryId?: string;
  realCategoryPath?: string;
}

interface CategoryAnalysisTableProps {
  keyword: string;
  totalItems: number;
  categories: CategoryInfo[];
}

const CategoryAnalysisTable = ({ keyword, totalItems, categories }: CategoryAnalysisTableProps) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCategoryClick = (category: CategoryInfo) => {
    console.log('클릭된 카테고리:', category);
    
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "카테고리 상세 분석을 위해서는 로그인이 필요합니다. 로그인 후 통합검색어 트렌드 페이지에서 해당 카테고리의 인기검색어를 확인하실 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    if (category.hasRealCategory && category.realCategoryId) {
      // 카테고리 클릭 시 통합검색어 트렌드로 이동하면서 카테고리 정보 전달
      const categoryInfo = {
        categoryId: category.realCategoryId,
        categoryName: category.realCategoryPath || category.name,
        categoryPath: category.realCategoryPath,
        level1: category.level1,
        level2: category.level2,
        level3: category.level3
      };
      
      console.log('저장할 카테고리 정보:', categoryInfo);
      
      // 로컬스토리지에 선택된 카테고리 정보 저장
      localStorage.setItem('selectedCategory', JSON.stringify(categoryInfo));
      
      toast({
        title: "카테고리 선택됨",
        description: `${categoryInfo.categoryName} 카테고리가 선택되었습니다. 통합검색어 트렌드 탭으로 이동합니다.`,
      });

      // 통합검색어 트렌드 탭으로 이동
      const trendTab = document.querySelector('[value="trend"]') as HTMLElement;
      if (trendTab) {
        trendTab.click();
        
        // 페이지 이동 후 잠시 대기하고 분야별 인기검색어 탭으로 이동
        setTimeout(() => {
          const popularTab = document.querySelector('[value="popular"]') as HTMLElement;
          if (popularTab) {
            popularTab.click();
          }
        }, 100);
      }
    } else {
      toast({
        title: "카테고리 정보 없음",
        description: "해당 카테고리는 등록된 카테고리 목록에서 찾을 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>'{keyword}' 카테고리 분석 결과</CardTitle>
        <p className="text-sm text-gray-600">
          총 {totalItems || 0}개 상품 분석 (실제 카테고리 구조 연동)
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>순위</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>대분류</TableHead>
              <TableHead>중분류</TableHead>
              <TableHead>소분류</TableHead>
              <TableHead>상품 수</TableHead>
              <TableHead>비율</TableHead>
              <TableHead>카테고리 코드</TableHead>
              <TableHead>상세 분석</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category, index) => (
              <TableRow 
                key={index}
                className={category.hasRealCategory ? "cursor-pointer hover:bg-blue-50" : ""}
                onClick={() => handleCategoryClick(category)}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      {category.realCategoryPath || category.name}
                      {category.hasRealCategory && user && (
                        <ExternalLink className="h-3 w-3 text-blue-500" />
                      )}
                      {!user && (
                        <Lock className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50">
                    {category.level1 || '-'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50">
                    {category.level2 || '-'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-purple-50">
                    {category.level3 || '-'}
                  </Badge>
                </TableCell>
                <TableCell>{category.count}개</TableCell>
                <TableCell>
                  <Badge variant="secondary">{category.percentage}%</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {category.hasRealCategory ? category.realCategoryId : 'N/A'}
                </TableCell>
                <TableCell>
                  {category.hasRealCategory ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-600">연동됨</Badge>
                      {!user && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          로그인 필요
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline">미연동</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {!user && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">상세 카테고리 분석</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              로그인하시면 카테고리를 클릭하여 통합검색어 트렌드 페이지에서 해당 카테고리의 인기검색어를 확인하실 수 있습니다.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryAnalysisTable;
