import React, { createContext, useContext, useState } from "react";


const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage if available
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sivels_currentUser');
      return saved ? JSON.parse(saved) : null;
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
    localStorage.removeItem('sivels_currentUser');
    localStorage.removeItem('sivels_permissions');
    localStorage.removeItem('sivels_roles');
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