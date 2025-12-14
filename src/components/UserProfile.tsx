
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, User, LogIn, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const UserProfile = () => {
  const { user, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) {
    return (
      <Button 
        onClick={() => navigate("/auth")}
        variant="outline" 
        className="flex items-center gap-2"
      >
        <LogIn className="h-4 w-4" />
        로그인
      </Button>
    );
  }

  const userInitial = user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-600 text-white">
              {userInitial.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium leading-none">
            {user.user_metadata?.full_name || '사용자'}
          </p>
          <p className="text-xs leading-none text-muted-foreground">
            {user.email}
          </p>
        </div>
        {isSuperAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            <span>관리자</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfile;
