/**
 * index.js — Back Office module entry point
 * --------------------
 * Purpose:
 *   Public API of the back-office module.
 *   When this module is copied into another project,
 *   the host app imports AppRoutes from here and
 *   mounts it inside a BrowserRouter.
 *
 * Usage in host app:
 *   import { BackOfficeRoutes } from './back-office';
 *   <BrowserRouter>
 *     <BackOfficeRoutes />
 *   </BrowserRouter>
 */

export { default as BackOfficeRoutes } from './routes/AppRoutes';
