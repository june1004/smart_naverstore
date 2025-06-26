
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import CategoryUpload from "./category/CategoryUpload";
import CategoryStats from "./category/CategoryStats";
import UploadHistory from "./category/UploadHistory";
import CategoryList from "./category/CategoryList";

const CategoryManager = () => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const { user } = useAuth();

  // 관리자 권한 확인 (june@nanumlab.com만 허용)
  const isAdmin = user?.email === 'june@nanumlab.com';

  const handleLevelFilter = (level: number | null) => {
    setSelectedLevel(level);
  };

  return (
    <div className="space-y-6">
      {/* 관리자 권한 알림 */}
      {user && !isAdmin && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            카테고리 업로드는 관리자 권한이 필요합니다. (june@nanumlab.com 계정만 가능) 현재 읽기 전용 모드입니다.
          </AlertDescription>
        </Alert>
      )}

      {!user && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            카테고리 관리 기능을 사용하려면 로그인이 필요합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* CSV/JSON 업로드 섹션 */}
      <CategoryUpload isAdmin={isAdmin} />

      {/* 업로드 기록 */}
      <UploadHistory />

      {/* 카테고리 통계 */}
      <CategoryStats onLevelFilter={handleLevelFilter} />

      {/* 카테고리 목록 */}
      <CategoryList selectedLevel={selectedLevel} onLevelFilter={handleLevelFilter} />
    </div>
  );
};

export default CategoryManager;
