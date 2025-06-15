
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ApiKeyManager from "./ApiKeyManager";
import CategoryUpload from "./category/CategoryUpload";
import CategoryStats from "./category/CategoryStats";
import UploadHistory from "./category/UploadHistory";
import CategoryList from "./category/CategoryList";
import { Card, CardContent } from "@/components/ui/card";

const ServiceManager = () => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const { user } = useAuth();

  // 관리자 권한 확인 (june@nanumlab.com만 허용)
  const isAdmin = user?.email === 'june@nanumlab.com';

  const handleLevelFilter = (level: number | null) => {
    if (!user) {
      // 로그인하지 않은 경우 필터링 무시
      return;
    }
    setSelectedLevel(level);
  };

  // 로그인하지 않은 사용자를 위한 안내 컴포넌트
  const LoginRequiredMessage = () => (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-6 text-center">
        <User className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-orange-700 mb-2">로그인이 필요한 기능입니다</h3>
        <p className="text-orange-600 mb-4">
          서비스 관리 기능을 사용하려면 회원가입 또는 로그인해주세요.
        </p>
        <p className="text-sm text-orange-500">
          아래 카테고리 통계는 참고용으로 제공되며, 상세 목록은 로그인 후 확인할 수 있습니다.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* 로그인 안내 메시지 */}
      {!user && <LoginRequiredMessage />}

      {/* 관리자 권한 알림 */}
      {user && !isAdmin && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            서비스 관리는 관리자 권한이 필요합니다. (june@nanumlab.com 계정만 가능) 현재 읽기 전용 모드입니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 네이버 API 설정 - 로그인 후에만 표시 */}
      {user && <ApiKeyManager />}

      {/* CSV/JSON 업로드 섹션 - 로그인 후에만 표시 */}
      {user && <CategoryUpload isAdmin={isAdmin} />}

      {/* 업로드 기록 - 로그인 후에만 표시 */}
      {user && <UploadHistory />}

      {/* 카테고리 통계 - 항상 표시 */}
      <CategoryStats onLevelFilter={handleLevelFilter} />

      {/* 카테고리 목록 - 로그인 후에만 표시 */}
      {user ? (
        <CategoryList selectedLevel={selectedLevel} onLevelFilter={handleLevelFilter} />
      ) : (
        <Card className="border-gray-200">
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-700 mb-2">카테고리 목록</h3>
            <p className="text-sm text-gray-500">
              카테고리 상세 목록을 보려면 로그인이 필요합니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceManager;
