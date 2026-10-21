import React, { createContext, useContext, useState } from "react";
import { clearSession } from "../auth/tokenStore";


const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage with recency-aware session resolution
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sivels_currentUser');
      const parsedSaved = saved ? JSON.parse(saved) : null;

      const agentAuthRaw = localStorage.getItem('agentAuth');
      const parsedAgentAuth = agentAuthRaw ? JSON.parse(agentAuthRaw) : null;

      const boAuthRaw = localStorage.getItem('backOfficeAuth');
      const parsedBoAuth = boAuthRaw ? JSON.parse(boAuthRaw) : null;

      const getTs = (obj) => {
        if (!obj || typeof obj !== 'object') return 0;
        const ts = obj.loginTimestamp || obj.timestamp || obj.createdAt;
        if (!ts) return 0;
        const ms = new Date(ts).getTime();
        return isNaN(ms) ? 0 : ms;
      };

      const agentTs = getTs(parsedAgentAuth);
      const boTs = getTs(parsedBoAuth);
      const savedTs = getTs(parsedSaved);

      // On /Agent routes, verify if Agent session is the authoritative one
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/Agent')) {
        if (parsedAgentAuth && parsedAgentAuth.isAuthenticated && agentTs >= boTs && agentTs >= savedTs) {
          return parsedAgentAuth;
        }
      }

      if (parsedSaved) {
        return parsedSaved;
      }
      if (parsedAgentAuth && parsedAgentAuth.isAuthenticated) {
        return parsedAgentAuth;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [permissions, setPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('sivels_permissions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [roles, setRoles] = useState(() => {
    try {
      const saved = localStorage.getItem('sivels_roles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const login = (userData, backendResponse) => {
    setCurrentUser(userData);
    localStorage.setItem('sivels_currentUser', JSON.stringify(userData));

    let generatedPermissions = [];
    let userRoles = [];

    if (backendResponse) {
      if (Array.isArray(backendResponse.roles)) {
        userRoles = backendResponse.roles;
      }
      
      const menus = backendResponse.menus || [];
      menus.forEach(menu => {
        if (Array.isArray(menu.permissions)) {
          menu.permissions.forEach(perm => {
            if (menu.menuName && perm.actionType) {
              const cleanedMenuName = menu.menuName.trim();
              const cleanedActionType = perm.actionType.trim();
              generatedPermissions.push(`${cleanedMenuName}_${cleanedActionType}`);
            }
          });
        }
      });
    }

    setPermissions(generatedPermissions);
    setRoles(userRoles);
    localStorage.setItem('sivels_permissions', JSON.stringify(generatedPermissions));
    localStorage.setItem('sivels_roles', JSON.stringify(userRoles));
  };

  const logout = () => {
    setCurrentUser(null);
    setPermissions([]);
    setRoles([]);
    clearSession();
  };

  const hasPermission = (permission) => {
    if (!permission) return true;
    const hasAccess = permissions.includes(permission);
    return hasAccess;
  };

  const getAvailableMenus = () => {
    const menus = new Set();
    permissions.forEach(p => {
      const menuName = p.split('_')[0];
      if (menuName) menus.add(menuName);
    });
    return Array.from(menus);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        permissions,
        roles,
        login,
        logout,
        hasPermission,
        getAvailableMenus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};