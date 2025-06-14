
import { useAuth } from "@/hooks/useAuth";
import Auth from "@/components/Auth";
import Header from "@/components/Header";
import KeywordSearch from "@/components/KeywordSearch";
import CategoryManager from "@/components/CategoryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Database } from "lucide-react";

const Index = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="keywords" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger 
              value="keywords" 
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              키워드 검색
            </TabsTrigger>
            <TabsTrigger 
              value="categories" 
              className="flex items-center gap-2 py-3 px-6 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              <Database className="h-4 w-4" />
              카테고리 관리
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keywords">
            <KeywordSearch />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
