import { useState, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ApiKeyManager from "./ApiKeyManager";
import CategoryUpload from "./category/CategoryUpload";
import UploadHistory from "./category/UploadHistory";
import CategoryList from "./category/CategoryList";
import { Card, CardContent } from "@/components/ui/card";

const ServiceManager = () => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const { user } = useAuth();
  const uploadHistoryRef = useRef<any>(null);

  // 수퍼관리자 권한 확인
  const { isSuperAdmin } = useAuth();

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
          상세 목록은 로그인 후 확인할 수 있습니다.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* 로그인 안내 메시지 */}
      {!user && <LoginRequiredMessage />}

      {/* 수퍼관리자 권한 알림 */}
      {user && !isSuperAdmin && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            서비스 관리는 수퍼관리자 권한이 필요합니다. 현재 읽기 전용 모드입니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 네이버 API 설정 - 수퍼관리자만 접근 가능 */}
      {isSuperAdmin && <ApiKeyManager />}

      {/* CSV/JSON 업로드 섹션 - 수퍼관리자만 접근 가능 */}
      {isSuperAdmin && <CategoryUpload isAdmin={isSuperAdmin} onUploadSuccess={() => uploadHistoryRef.current?.()} />}

      {/* 업로드 기록 - 로그인 후에만 표시 */}
      {user && <UploadHistory refetchRef={uploadHistoryRef} />}

      {/* 카테고리 목록 - 로그인 후에만 표시 */}
      {user ? (
        <div id="category-list-section">
          <CategoryList selectedLevel={selectedLevel} onLevelFilter={handleLevelFilter} />
        </div>
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
