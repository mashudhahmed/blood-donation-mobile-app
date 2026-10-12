'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

export type UserRole = 'ADMIN' | 'HOSPITAL' | 'BLOOD_BANK';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  organization: string;
  email: string;
  badge: string;
  avatarLetter: string;
  phone?: string;
  district?: string;
  licenseNumber?: string;
  position?: string;
  department?: string;
  facilityId?: string;
  isStaff?: boolean;
  permissions?: string[];
}

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  organization: string;
  role: UserRole;
  phone: string;
  district: string;
  licenseNumber?: string;
}

interface AuthContextType {
  role: UserRole;
  user: AuthUser;
  token: string | null;
  isAuthenticated: boolean;
  login: (selectedRole: UserRole, email?: string) => void;
  loginWithJwt: (email: string, password: string, role?: UserRole) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  registerWithJwt: (data: RegisterPayload) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

export const ROLE_PROFILES: Record<UserRole, AuthUser> = {
  ADMIN: {
    id: 'usr_admin_001',
    name: 'System Administrator',
    role: 'ADMIN',
    organization: 'BloodLink Administration',
    email: 'admin@bloodlink.org',
    badge: 'Administrator',
    avatarLetter: 'A',
    phone: '+880222334455',
    district: 'Dhaka',
  },
  HOSPITAL: {
    id: 'usr_hosp_001',
    name: 'Dr. Rafiqul Islam',
    role: 'HOSPITAL',
    organization: 'Dhaka Medical College Hospital',
    email: 'hospital@dmc.edu.bd',
    badge: 'Chief Medical Officer',
    avatarLetter: 'H',
    licenseNumber: 'LIC-2021-9921',
    phone: '+880255165088',
    district: 'Dhaka',
  },
  BLOOD_BANK: {
    id: 'usr_bb_001',
    name: 'Nusrat Jahan',
    role: 'BLOOD_BANK',
    organization: 'Red Crescent Blood Center',
    email: 'contact@redcrescent.org.bd',
    badge: 'Blood Bank Director',
    avatarLetter: 'B',
    licenseNumber: 'LIC-2018-041',
    phone: '+88029330188',
    district: 'Dhaka',
  },
};

const AuthContext = createContext<AuthContextType>({
  role: 'ADMIN',
  user: ROLE_PROFILES.ADMIN,
  token: null,
  isAuthenticated: false,
  login: () => {},
  loginWithJwt: async () => ({ success: false }),
  registerWithJwt: async () => ({ success: false }),
  logout: () => {},
  switchRole: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [user, setUser] = useState<AuthUser>(ROLE_PROFILES.ADMIN);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bloodlink_auth_v2');
      const savedToken = localStorage.getItem('bloodlink_jwt_token');

      if (savedToken && stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role && ROLE_PROFILES[parsed.role as UserRole]) {
          setToken(savedToken);
          api.setToken(savedToken);
          setRole(parsed.role as UserRole);
          setUser(parsed.user || ROLE_PROFILES[parsed.role as UserRole]);
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.warn('Could not restore auth session', e);
      setIsAuthenticated(false);
    }
  }, []);

  const saveState = (newRole: UserRole, newUser: AuthUser, authState: boolean, jwtToken?: string) => {
    setRole(newRole);
    setUser(newUser);
    setIsAuthenticated(authState);
    if (jwtToken) {
      setToken(jwtToken);
      api.setToken(jwtToken);
      localStorage.setItem('bloodlink_jwt_token', jwtToken);
    }
    try {
      if (authState) {
        localStorage.setItem(
          'bloodlink_auth_v2',
          JSON.stringify({ role: newRole, user: newUser, isAuthenticated: true })
        );
      } else {
        localStorage.removeItem('bloodlink_auth_v2');
      }
    } catch (e) {
      console.warn('Storage error', e);
    }
  };

  const login = (selectedRole: UserRole, customEmail?: string) => {
    const baseUser = ROLE_PROFILES[selectedRole];
    const loggedUser: AuthUser = {
      ...baseUser,
      email: customEmail || baseUser.email,
    };
    saveState(selectedRole, loggedUser, true);
  };

  const normalizeRole = (r?: string): UserRole => {
    if (!r) return 'ADMIN';
    const clean = r.toUpperCase().replace(/[\s_-]/g, '');
    if (clean === 'BLOODBANK') return 'BLOOD_BANK';
    if (clean === 'HOSPITAL') return 'HOSPITAL';
    return 'ADMIN';
  };

  const loginWithJwt = async (email: string, password: string, targetRole?: UserRole) => {
    try {
      const res = await api.authLogin({ email, password });
      if (res && res.token) {
        const userRole: UserRole = normalizeRole(res.user?.role || targetRole);
        const loggedUser: AuthUser = {
          id: res.user?.id || 'usr_' + Date.now().toString().slice(-4),
          name: res.user?.name || ROLE_PROFILES[userRole].name,
          role: userRole,
          organization: res.user?.organization || ROLE_PROFILES[userRole].organization,
          email: res.user?.email || email,
          badge: res.user?.position || ROLE_PROFILES[userRole].badge,
          avatarLetter: (res.user?.name || userRole).charAt(0).toUpperCase(),
          phone: res.user?.phone,
          district: res.user?.district,
          licenseNumber: res.user?.licenseNumber,
          position: res.user?.position,
          department: res.user?.department,
          facilityId: res.user?.facilityId,
          isStaff: res.user?.isStaff,
          permissions: res.user?.permissions,
        };

        saveState(userRole, loggedUser, true, res.token);
        return { success: true, role: userRole };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      return { success: false, error: msg };
    }
  };

  const registerWithJwt = async (data: RegisterPayload) => {
    try {
      const res = await api.authRegister(data);
      if (res && res.token) {
        const userRole: UserRole = normalizeRole(res.user?.role || data.role);
        const loggedUser: AuthUser = {
          id: res.user?.id || 'usr_' + Date.now().toString().slice(-4),
          name: data.name,
          role: userRole,
          organization: data.organization,
          email: data.email,
          badge: `${userRole === 'ADMIN' ? 'Super Admin' : userRole === 'HOSPITAL' ? 'Hospital Staff' : 'Blood Bank Officer'}`,
          avatarLetter: userRole.charAt(0),
          phone: data.phone,
          district: data.district,
          licenseNumber: data.licenseNumber,
        };

        saveState(userRole, loggedUser, true, res.token);
        return { success: true, role: userRole };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('bloodlink_jwt_token');
    localStorage.removeItem('bloodlink_auth_v2');
    api.setToken(null);
    setToken(null);
    setIsAuthenticated(false);
    setUser(ROLE_PROFILES.ADMIN);
    router.push('/login');
  };

  const switchRole = (newRole: UserRole) => {
    const newUser = ROLE_PROFILES[newRole];
    saveState(newRole, newUser, true);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        token,
        isAuthenticated,
        login,
        loginWithJwt,
        registerWithJwt,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
