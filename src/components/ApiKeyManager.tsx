
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Shield } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ApiKeyManager = () => {
  const { isSuperAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [solutionId, setSolutionId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [applicationSecret, setApplicationSecret] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    // 네이버 커머스 API 정보 저장
    if (solutionId.trim() || applicationId.trim() || applicationSecret.trim()) {
      localStorage.setItem('naver_solution_id', solutionId);
      localStorage.setItem('naver_application_id', applicationId);
      localStorage.setItem('naver_application_secret', applicationSecret);
    }
    
    // 네이버 일반 API 정보 저장
    if (clientId.trim() || clientSecret.trim()) {
      localStorage.setItem('naver_client_id', clientId);
      localStorage.setItem('naver_client_secret', clientSecret);
    }

    const hasCommerceConfig = solutionId.trim() && applicationId.trim() && applicationSecret.trim();
    const hasGeneralConfig = clientId.trim() && clientSecret.trim();
    
    if (!hasCommerceConfig && !hasGeneralConfig) {
      toast({
        title: "입력 오류",
        description: "최소한 하나의 API 설정(커머스 또는 일반)을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    setIsConfigured(true);
    setIsOpen(false);
    
    toast({
      title: "설정 완료",
      description: "네이버 API 키가 성공적으로 설정되었습니다.",
    });
  };

  const handleReset = () => {
    setSolutionId("");
    setApplicationId("");
    setApplicationSecret("");
    setClientId("");
    setClientSecret("");
    setIsConfigured(false);
    localStorage.removeItem('naver_solution_id');
    localStorage.removeItem('naver_application_id');
    localStorage.removeItem('naver_application_secret');
    localStorage.removeItem('naver_client_id');
    localStorage.removeItem('naver_client_secret');
    setIsOpen(true);
    
    toast({
      title: "설정 초기화",
      description: "네이버 API 키 설정이 초기화되었습니다.",
    });
  };

  // 컴포넌트 마운트 시 저장된 설정 확인
  useEffect(() => {
    const savedSolutionId = localStorage.getItem('naver_solution_id');
    const savedApplicationId = localStorage.getItem('naver_application_id');
    const savedApplicationSecret = localStorage.getItem('naver_application_secret');
    const savedClientId = localStorage.getItem('naver_client_id');
    const savedClientSecret = localStorage.getItem('naver_client_secret');
    
    if (savedSolutionId) setSolutionId(savedSolutionId);
    if (savedApplicationId) setApplicationId(savedApplicationId);
    if (savedApplicationSecret) setApplicationSecret(savedApplicationSecret);
    if (savedClientId) setClientId(savedClientId);
    if (savedClientSecret) setClientSecret(savedClientSecret);
    
    if ((savedSolutionId && savedApplicationId && savedApplicationSecret) || (savedClientId && savedClientSecret)) {
      setIsConfigured(true);
    } else {
      setIsOpen(true);
    }
  }, []);

  // 수퍼관리자가 아닌 경우 접근 제한
  if (!isSuperAdmin) {
    return (
      <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              네이버 API 설정은 수퍼관리자만 접근할 수 있습니다.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                네이버 API 설정
                <Shield className="h-4 w-4 text-purple-600" />
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
          <CardContent className="space-y-6">
            {/* 네이버 커머스 API 설정 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">네이버 커머스 API</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="solutionId">솔루션 ID</Label>
                  <Input
                    id="solutionId"
                    placeholder="SOL_..."
                    value={solutionId}
                    onChange={(e) => setSolutionId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationId">애플리케이션 ID</Label>
                  <Input
                    id="applicationId"
                    placeholder="애플리케이션 ID"
                    value={applicationId}
                    onChange={(e) => setApplicationId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationSecret">애플리케이션 Secret</Label>
                  <Input
                    id="applicationSecret"
                    type="password"
                    placeholder="애플리케이션 Secret"
                    value={applicationSecret}
                    onChange={(e) => setApplicationSecret(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 네이버 일반 API 설정 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800">네이버 일반 API (선택사항)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">클라이언트 ID</Label>
                  <Input
                    id="clientId"
                    placeholder="네이버 클라이언트 ID를 입력하세요"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">클라이언트 시크릿</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="네이버 클라이언트 시크릿을 입력하세요"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                  />
                </div>
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ApiKeyManager;
