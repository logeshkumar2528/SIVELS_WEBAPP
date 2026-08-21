import React, { createContext, useContext, useState } from "react";


const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);

  const login = (userData, backendResponse) => {
    setCurrentUser(userData);

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

  };



  const logout = () => {
    setCurrentUser(null);
    setPermissions([]);
    setRoles([]);
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