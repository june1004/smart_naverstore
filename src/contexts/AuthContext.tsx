
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  hasActiveSubscription: boolean;
  hasStoreAddon: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [hasStoreAddon, setHasStoreAddon] = useState(false);

  // 수퍼관리자/구독 상태 확인
  useEffect(() => {
    const checkEntitlements = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setHasActiveSubscription(false);
        setHasStoreAddon(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_super_admin,is_paid_subscriber,store_addon_active')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('수퍼관리자 확인 오류:', error);
          // 오류 발생 시 이메일로 폴백 체크
          setIsSuperAdmin(user.email === 'june@nanumlab.com');
          // 구독 정보는 폴백 불가(보안상) → 기본 false
          setHasActiveSubscription(false);
          setHasStoreAddon(false);
        } else {
          const superAdmin = data?.is_super_admin === true || user.email === 'june@nanumlab.com';
          setIsSuperAdmin(superAdmin);
          setHasActiveSubscription(superAdmin || data?.is_paid_subscriber === true);
          setHasStoreAddon(superAdmin || data?.store_addon_active === true);
        }
      } catch (error) {
        console.error('수퍼관리자 확인 중 오류:', error);
        // 오류 발생 시 이메일로 폴백 체크
        setIsSuperAdmin(user.email === 'june@nanumlab.com');
        setHasActiveSubscription(false);
        setHasStoreAddon(false);
      }
    };

    checkEntitlements();
  }, [user]);

  useEffect(() => {
    // 인증 상태 변화 리스너 설정
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isSuperAdmin,
      hasActiveSubscription,
      hasStoreAddon,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
