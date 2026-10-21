export const LEVELS = ['VIEW', 'EDIT', 'APPROVE'];
export const LEVEL_LABELS = { VIEW: 'View', EDIT: 'Edit', APPROVE: 'Approve' };

// Legacy type on StaffUser -> system role code a staff member's role must be based on.
const ROLE_CODE_BY_LEGACY_TYPE = {
  Agent: 'AGENT',
  RM: 'RM',
  AMS: 'AMS',
  BackOffice: 'BACK_OFFICE',
  CreditManager: 'CREDIT_MANAGER',
  CreditHead: 'CREDIT_HEAD',
};

/** Codes every role keeps (dashboard and master lookups), as flagged by the catalog. */
export function alwaysGrantedCodes(catalog) {
  return (catalog || []).flatMap((module) =>
    (module.permissions || []).filter((p) => p.alwaysGranted).map((p) => p.code)
  );
}

/**
 * One row per module with a cell per level: the permission code (or null when the module has no
 * such level), whether the role holds it, whether the base role allows it at all and whether it
 * is always granted (shown ticked and locked).
 */
export function buildGrid(catalog, selected, available) {
  const chosen = new Set(selected || []);
  const allowed = new Set(available || []);
  return (catalog || []).map((module) => {
    const byLevel = Object.fromEntries((module.permissions || []).map((p) => [p.level, p]));
    return {
      code: module.code,
      name: module.name,
      description: module.description,
      cells: LEVELS.map((level) => {
        const permission = byLevel[level];
        if (!permission) return { level, code: null, checked: false, allowed: false, locked: false };
        const isAllowed = allowed.has(permission.code);
        const locked = Boolean(permission.alwaysGranted) && isAllowed;
        return { level, code: permission.code, checked: locked || chosen.has(permission.code), allowed: isAllowed, locked };
      }),
    };
  });
}

function moduleOf(code) {
  return String(code).split('.')[0];
}

/**
 * Toggles one permission. Edit and Approve need View of the same module, so turning them on also
 * turns on View, and turning View off clears the module. Codes the base role doesn't allow and
 * always-granted codes are left as they are.
 */
export function togglePermission(selected, code, available, locked = []) {
  const allowed = new Set(available || []);
  const keep = new Set(locked);
  if (!allowed.has(code) || keep.has(code)) return [...(selected || [])];

  const next = new Set(selected || []);
  const module = moduleOf(code);
  const view = `${module}.VIEW`;

  if (next.has(code)) {
    next.delete(code);
    if (code === view) {
      [...next].filter((c) => moduleOf(c) === module && !keep.has(c)).forEach((c) => next.delete(c));
    }
  } else {
    next.add(code);
    if (code !== view && allowed.has(view)) next.add(view);
  }
  return [...next];
}

/** Selects or clears every allowed permission of one module; always-granted codes stay on. */
export function setModule(selected, moduleCode, on, available, locked = []) {
  const keep = new Set(locked);
  const next = new Set(selected || []);
  (available || [])
    .filter((code) => moduleOf(code) === moduleCode)
    .forEach((code) => (on || keep.has(code) ? next.add(code) : next.delete(code)));
  return [...next];
}

/** Codes added and removed between two selections, for the confirmation summary. */
export function diffPermissions(before, after) {
  const a = new Set(before || []);
  const b = new Set(after || []);
  return {
    added: [...b].filter((c) => !a.has(c)).sort(),
    removed: [...a].filter((c) => !b.has(c)).sort(),
  };
}

/** Roles a staff member may be given: active roles whose base role matches their type. */
export function rolesForStaff(staff, roles) {
  const typeCode = staff?.legacyType ? ROLE_CODE_BY_LEGACY_TYPE[staff.legacyType] : 'MASTER_ADMIN';
  return (roles || []).filter((role) => role.isActive && role.baseRoleCode === typeCode);
}
