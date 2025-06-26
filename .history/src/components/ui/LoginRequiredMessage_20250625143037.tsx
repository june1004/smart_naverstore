import React from "react";
import { User, Search } from "lucide-react";

interface LoginRequiredMessageProps {
  title?: string;
  description?: string;
  keyword?: string;
  highlightColor?: string; // 예: orange, green 등
}

const LoginRequiredMessage: React.FC<LoginRequiredMessageProps> = ({
  title = "로그인이 필요한 기능입니다",
  description = "이 기능을 사용하려면 회원가입 또는 로그인해주세요.",
  keyword,
  highlightColor = "orange"
}) => {
  const colorClass = highlightColor === "green"
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-orange-200 bg-orange-50 text-orange-700";
  const iconColor = highlightColor === "green" ? "text-green-500" : "text-orange-500";
  const keywordColor = highlightColor === "green" ? "text-green-800" : "text-orange-800";

  return (
    <div className={`rounded-lg border ${colorClass} p-6 text-center space-y-4`}>
      <User className={`h-12 w-12 mx-auto mb-2 ${iconColor}`} />
      <h3 className={`text-lg font-semibold ${iconColor}`}>{title}</h3>
      <p className={`${iconColor}`}>{description}</p>
      {keyword && (
        <div className="bg-white p-3 rounded-lg border mt-4">
          <div className="flex items-center gap-2">
            <Search className={`h-4 w-4 ${iconColor}`} />
            <span className="font-medium">AI 자동분석에서 전달된 키워드:</span>
          </div>
          <p className={`text-lg font-bold mt-1 ${keywordColor}`}>"{keyword}"</p>
          <p className="text-sm text-gray-600 mt-2">로그인 후 이 키워드로 상세 분석을 진행할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
};

export default LoginRequiredMessage; 