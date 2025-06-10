
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Key, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ApiKeyManager = () => {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // 로컬 스토리지에서 설정 확인
    const savedClientId = localStorage.getItem('naver_client_id');
    const savedClientSecret = localStorage.getItem('naver_client_secret');
    
    if (savedClientId && savedClientSecret) {
      setClientId(savedClientId);
      setClientSecret(savedClientSecret);
      setIsConfigured(true);
      setIsOpen(false); // 설정 완료되면 접힌 상태로
    } else {
      setIsOpen(true); // 설정이 없으면 펼친 상태로
    }
  }, []);

  const saveApiKeys = () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "API 키를 입력해주세요",
        description: "네이버 오픈 API 클라이언트 ID와 시크릿을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('naver_client_id', clientId.trim());
    localStorage.setItem('naver_client_secret', clientSecret.trim());
    setIsConfigured(true);
    setIsOpen(false); // 저장 후 접기

    toast({
      title: "API 키 저장 완료",
      description: "네이버 API 키가 성공적으로 저장되었습니다.",
    });
  };

  const resetApiKeys = () => {
    localStorage.removeItem('naver_client_id');
    localStorage.removeItem('naver_client_secret');
    setClientId("");
    setClientSecret("");
    setIsConfigured(false);
    setIsOpen(true); // 재설정시 펼치기

    toast({
      title: "API 키 초기화",
      description: "저장된 API 키가 삭제되었습니다.",
    });
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                네이버 오픈 API 설정
                {isConfigured && (
                  <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                    설정 완료
                  </span>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {!isConfigured && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">네이버 오픈 API 신청이 필요합니다</p>
                  <p>
                    <a 
                      href="https://developers.naver.com/apps/#/register" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      네이버 개발자 센터
                    </a>에서 애플리케이션을 등록하고 클라이언트 ID와 시크릿을 발급받으세요.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">클라이언트 ID</label>
                <Input
                  type="text"
                  placeholder="네이버 API 클라이언트 ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={isConfigured}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">클라이언트 시크릿</label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    placeholder="네이버 API 클라이언트 시크릿"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    disabled={isConfigured}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!isConfigured ? (
                <Button onClick={saveApiKeys} className="bg-blue-600 hover:bg-blue-700">
                  API 키 저장
                </Button>
              ) : (
                <Button onClick={resetApiKeys} variant="outline">
                  API 키 재설정
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
