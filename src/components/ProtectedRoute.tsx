import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  requireStoreAddon?: boolean;
}

const ProtectedRoute = ({ children, requireSubscription, requireStoreAddon }: ProtectedRouteProps) => {
  const { user, loading, hasActiveSubscription, hasStoreAddon } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
    if (!loading && user) {
      if (requireSubscription && !hasActiveSubscription) {
        navigate("/pricing?reason=subscription", { replace: true });
        return;
      }
      if (requireStoreAddon && !hasStoreAddon) {
        navigate("/pricing?reason=store-addon", { replace: true });
        return;
      }
    }
  }, [user, loading, navigate, requireSubscription, requireStoreAddon, hasActiveSubscription, hasStoreAddon]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F9F8]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F4C5C] mx-auto" />
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // 리다이렉트 중이므로 아무것도 렌더링하지 않음
  }

  if (requireSubscription && !hasActiveSubscription) return null;
  if (requireStoreAddon && !hasStoreAddon) return null;

  return <>{children}</>;
};

export default ProtectedRoute;

