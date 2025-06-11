
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, BarChart, Hash } from "lucide-react";
import ShoppingSearch from "./ShoppingSearch";
import MonthlySearchStats from "./MonthlySearchStats";
import KeywordExtraction from "./KeywordExtraction";

const KeywordSearch = () => {
  return (
    <Tabs defaultValue="shopping" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger 
          value="shopping" 
          className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
        >
          <ShoppingCart className="h-4 w-4" />
          쇼핑 검색
        </TabsTrigger>
        <TabsTrigger 
          value="stats" 
          className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-green-600 data-[state=active]:text-white"
        >
          <BarChart className="h-4 w-4" />
          월간 검색 통계
        </TabsTrigger>
        <TabsTrigger 
          value="extraction" 
          className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
        >
          <Hash className="h-4 w-4" />
          키워드추출
        </TabsTrigger>
      </TabsList>

      <TabsContent value="shopping">
        <ShoppingSearch />
      </TabsContent>

      <TabsContent value="stats">
        <MonthlySearchStats />
      </TabsContent>

      <TabsContent value="extraction">
        <KeywordExtraction />
      </TabsContent>
    </Tabs>
  );
};

export default KeywordSearch;
