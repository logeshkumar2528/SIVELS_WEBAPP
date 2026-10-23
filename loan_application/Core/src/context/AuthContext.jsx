import React, { createContext, useContext, useState } from "react";
import { clearSession } from "../auth/tokenStore";
import { getStoredUser } from "../auth/session";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize state using tab-aware and route-aware session resolution
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return getStoredUser();
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
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('sivels_tabUser', JSON.stringify(userData));
        if (userData?.roleCode) {
          sessionStorage.setItem('sivels_tabRole', userData.roleCode);
        }
      }
    } catch {}

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
