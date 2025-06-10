
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, AlertCircle, CheckCircle } from "lucide-react";

const ApiKeyManager = () => {
  return (
    <Card className="mb-6">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          네이버 오픈 API 설정 안내
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-2 p-4 bg-green-50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium mb-2">환경 변수로 API 키가 안전하게 관리됩니다</p>
            <p>
              네이버 API 키는 서버의 환경 변수 <code className="bg-green-100 px-1 rounded">NAVER_CLIENT_ID</code>와 
              <code className="bg-green-100 px-1 rounded ml-1">NAVER_CLIENT_SECRET</code>에 설정되어 있습니다.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-2">API 키 발급이 필요한 경우</p>
            <p>
              <a 
                href="https://developers.naver.com/apps/#/register" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:no-underline font-medium"
              >
                네이버 개발자 센터
              </a>에서 애플리케이션을 등록하고 클라이언트 ID와 시크릿을 발급받으세요.
            </p>
            <div className="mt-3 space-y-1">
              <p className="font-medium">설정해야 할 환경 변수:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li><code className="bg-blue-100 px-1 rounded">NAVER_CLIENT_ID</code>: 네이버 API 클라이언트 ID</li>
                <li><code className="bg-blue-100 px-1 rounded">NAVER_CLIENT_SECRET</code>: 네이버 API 클라이언트 시크릿</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyManager;
