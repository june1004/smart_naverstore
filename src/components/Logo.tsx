import { ShoppingCart } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className = "", showText = true, size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };

  const textSizeClasses = {
    sm: "text-lg sm:text-xl",
    md: "text-2xl sm:text-4xl",
    lg: "text-4xl sm:text-5xl",
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-blue-600 rounded-lg blur-sm opacity-30"></div>
        <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-1.5 sm:p-2 shadow-lg">
          <ShoppingCart className={`${sizeClasses[size]} text-white`} />
        </div>
      </div>
      {showText && (
        <div className="hidden sm:flex sm:flex-col">
          <h1 className={`${textSizeClasses[size]} font-bold text-foreground leading-tight`}>
            네이버 쇼핑몰
          </h1>
          <p className={`${size === "sm" ? "text-xs" : "text-xs sm:text-sm"} text-muted-foreground font-medium`}>
            분석 도구
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo;

