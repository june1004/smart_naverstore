
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

const ApiKeyManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "입력 오류",
        description: "네이버 클라이언트 ID와 시크릿을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 로컬 스토리지에 임시 저장 (실제로는 환경변수를 사용)
    localStorage.setItem('naver_client_id', clientId);
    localStorage.setItem('naver_client_secret', clientSecret);
    
    setIsConfigured(true);
    setIsOpen(false);
    
    toast({
      title: "설정 완료",
      description: "네이버 API 키가 성공적으로 설정되었습니다.",
    });
  };

  const handleReset = () => {
    setClientId("");
    setClientSecret("");
    setIsConfigured(false);
    localStorage.removeItem('naver_client_id');
    localStorage.removeItem('naver_client_secret');
    setIsOpen(true);
    
    toast({
      title: "설정 초기화",
      description: "네이버 API 키 설정이 초기화되었습니다.",
    });
  };

  // 컴포넌트 마운트 시 저장된 설정 확인
  useState(() => {
    const savedClientId = localStorage.getItem('naver_client_id');
    const savedClientSecret = localStorage.getItem('naver_client_secret');
    
    if (savedClientId && savedClientSecret) {
      setIsConfigured(true);
    } else {
      setIsOpen(true);
    }
  });

  return (
    <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                네이버 API 설정
                {isConfigured ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">네이버 클라이언트 ID</Label>
                <Input
                  id="clientId"
                  placeholder="네이버 클라이언트 ID를 입력하세요"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">네이버 클라이언트 시크릿</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="네이버 클라이언트 시크릿을 입력하세요"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                저장
              </Button>
              {isConfigured && (
                <Button onClick={handleReset} variant="outline">
                  초기화
                </Button>
              )}
            </div>
            
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p className="font-medium mb-1">📌 네이버 개발자센터에서 API 키를 발급받으세요:</p>
              <p>1. https://developers.naver.com/apps/ 접속</p>
              <p>2. 애플리케이션 등록 → 쇼핑 API 사용 설정</p>
              <p>3. 클라이언트 ID와 시크릿 복사하여 입력</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ApiKeyManager;
