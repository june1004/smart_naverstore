
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CategoryAnalysis } from "@/types/shopping";

interface CategoryAnalysisAccordionProps {
  categoryAnalysis: CategoryAnalysis;
}

const CategoryAnalysisAccordion = ({ categoryAnalysis }: CategoryAnalysisAccordionProps) => {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="category-analysis">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span className="font-semibold">카테고리 분석</span>
            {categoryAnalysis.mainCategory && (
              <Badge variant="outline" className="text-sm">
                주요: {categoryAnalysis.mainCategory[0]} ({categoryAnalysis.mainCategory[1]}개)
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {categoryAnalysis.mainCategory && (
                  <div>
                    <h4 className="font-medium mb-2">주요 카테고리</h4>
                    <Badge variant="outline" className="text-sm">
                      {categoryAnalysis.mainCategory[0]} ({categoryAnalysis.mainCategory[1]}개)
                    </Badge>
                  </div>
                )}
                <div>
                  <h4 className="font-medium mb-2">전체 카테고리 분포</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {categoryAnalysis.allCategories.slice(0, 12).map(([category, count], index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {category.split('>')[0]} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default CategoryAnalysisAccordion;
