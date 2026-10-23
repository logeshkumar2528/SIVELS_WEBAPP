import { createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import './MasterEditAccess.css';

const MasterEditContext = createContext(true);

export function useMasterEditAccess() {
  return useContext(MasterEditContext);
}

/** Route wrapper: pages below it lose their add, edit and delete controls when the role lacks `permission`. */
export function MasterEditAccess({ permission = 'MASTERS.EDIT' }) {
  const { can } = usePermissions();
  const canEdit = can(permission);

  return (
    <MasterEditContext.Provider value={canEdit}>
      <div className={canEdit ? 'masters-access' : 'masters-access masters-access--readonly'}>
        <Outlet />
      </div>
    </MasterEditContext.Provider>
  );
}
