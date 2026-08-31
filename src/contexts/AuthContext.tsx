import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  User,
  Session,
  Profile,
  Entitlement,
  AuthState,
  AuthContextType,
} from '../types/auth.types';
import type { AppRole } from '../types/database.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to fetch user profiles, roles, and entitlements
  const fetchUserAccessDetails = useCallback(async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
      } else {
        setProfile(null);
      }

      // 2. Fetch Roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      const userRoles: AppRole[] = rolesData
        ? (rolesData as any[]).map((r) => r.role as AppRole)
        : [];
      setRoles(userRoles);

      // 3. Fetch Entitlement (PEA)
      const { data: entitlementData } = await supabase
        .from('entitlements')
        .select('*')
        .eq('user_id', userId)
        .eq('product_code', 'PEA')
        .single();

      let currentEntitlement: Entitlement | null = null;
      if (entitlementData) {
        currentEntitlement = entitlementData as Entitlement;
        setEntitlement(currentEntitlement);
      } else {
        setEntitlement(null);
      }

      const isAdmin = userRoles.includes('admin');
      const isEntitled =
        currentEntitlement?.product_code === 'PEA' && currentEntitlement?.status === 'active';

      return {
        profile: profileData as Profile | null,
        roles: userRoles,
        entitlement: currentEntitlement,
        isAdmin,
        isEntitled,
      };
    } catch (err) {
      console.error('Error fetching user access details:', err);
      return {
        profile: null,
        roles: [] as AppRole[],
        entitlement: null,
        isAdmin: false,
        isEntitled: false,
      };
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session as Session | null;
        const currentUser = currentSession?.user as User | null;

        if (isMounted) {
          setSession(currentSession);
          setUser(currentUser);

          if (currentUser?.id) {
            await fetchUserAccessDetails(currentUser.id);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, changedSession: any) => {
        setIsLoading(true);
        const newSession = changedSession as Session | null;
        const newUser = newSession?.user as User | null;

        setSession(newSession);
        setUser(newUser);

        if (newUser?.id) {
          await fetchUserAccessDetails(newUser.id);
        } else {
          setProfile(null);
          setRoles([]);
          setEntitlement(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [fetchUserAccessDetails]);

  // Sign In handler
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error as Error };
      }

      const signedInUser = data?.user as User | null;
      const signedInSession = data?.session as Session | null;

      setUser(signedInUser);
      setSession(signedInSession);

      if (signedInUser?.id) {
        const access = await fetchUserAccessDetails(signedInUser.id);
        return {
          error: null,
          isAdmin: access.isAdmin,
          isEntitled: access.isEntitled,
          roles: access.roles,
          entitlement: access.entitlement,
        };
      }

      return {
        error: null,
        isAdmin: false,
        isEntitled: false,
        roles: [],
        entitlement: null,
      };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Sign Out handler
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setRoles([]);
      setEntitlement(null);
      return { error: error ? (error as Error) : null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Password Recovery handler
  const resetPasswordForEmail = async (email: string) => {
    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      return { error: error ? (error as Error) : null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Update Password handler
  const updateUserPassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      return { error: error ? (error as Error) : null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Refresh User Access details
  const refreshUserAccess = async () => {
    if (user?.id) {
      await fetchUserAccessDetails(user.id);
    }
  };

  const refreshEntitlement = async () => {
    await refreshUserAccess();
  };

  const isAdmin = roles.includes('admin');
  const isEntitled =
    (entitlement?.product_code === 'PEA' && entitlement?.status === 'active') || isAdmin;

  const contextValue: AuthContextType = {
    user,
    session,
    profile,
    roles,
    entitlement,
    isLoading,
    isAdmin,
    isEntitled,
    signIn,
    signOut,
    resetPasswordForEmail,
    updateUserPassword,
    refreshUserAccess,
    refreshEntitlement,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
