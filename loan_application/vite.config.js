import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// URL prefix → module folder mapping
const moduleMap = [
  { prefix: '/Agent',      dir: 'Business_Modules/agent_module'    },
  { prefix: '/backoffice', dir: 'Business_Modules/back_office'     },
  { prefix: '/investors',  dir: 'Business_Modules/investor_module' },
  { prefix: '/rm',         dir: 'Business_Modules/rm_modules'      },
  { prefix: '/client',     dir: 'Business_Modules/customer_module' },
  { prefix: '/dashboard',  dir: 'Business_Modules/customer_module' },
  { prefix: '/my-loan',    dir: 'Business_Modules/customer_module' },
  { prefix: '/emi-history', dir: 'Business_Modules/customer_module' },
  { prefix: '/profile',    dir: 'Business_Modules/customer_module' },
  { prefix: '/credit',     dir: 'Business_Modules/credit_manager'  },
  { prefix: '/company',    dir: 'Business_Modules/company details'  },
  { prefix: '/master',     dir: 'Master_Module'                   },
  // Auth routes → Core (common entry point)
  { prefix: '/login',      dir: 'Core' },
  { prefix: '/verify',     dir: 'Core' },
  { prefix: '/signup',     dir: 'Core' },
  { prefix: '/otp',        dir: 'Core' },
];
// Default module (Core / customer)
const defaultDir = 'Core';
function getModuleDir(url) {
  for (const m of moduleMap) {
    if (url === m.prefix || url.startsWith(m.prefix + '/') || url.startsWith(m.prefix + '?')) {
      return m.dir;
    }
  }
  return defaultDir;
}
const multiModulePlugin = () => ({
  name: 'multi-module-router',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url.split('?')[0];
      if (
        url.startsWith('/@') ||
        url.startsWith('/node_modules') ||
        url.startsWith('/Business_Modules') ||
        url.startsWith('/Core') ||
        url.match(/\.(js|jsx|ts|tsx|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|json|map)$/)
      ) {
        return next();
      }
      const moduleDir = getModuleDir(url);
      const htmlPath = path.resolve(__dirname, moduleDir, 'index.html');
      if (!fs.existsSync(htmlPath)) {
        return next();
      }
      let html = fs.readFileSync(htmlPath, 'utf-8');
      html = html.replace(
        /(src|href)="\/src\//g,
        `$1="/${moduleDir}/src/`
      );
      html = html.replace(
        /(src|href)="\/(?!Business_Modules|Core|@|node_modules)([^"]+\.(svg|png|ico|jpg|jpeg|gif|webp))"/g,
        `$1="/${moduleDir}/public/$2"`
      );
      html = await server.transformIndexHtml(req.url, html);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    });
  }
});

export default defineConfig({
  plugins: [react(), multiModulePlugin()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        core: path.resolve(__dirname, 'Core/index.html'),
        agent: path.resolve(__dirname, 'Business_Modules/agent_module/index.html'),
        backoffice: path.resolve(__dirname, 'Business_Modules/back_office/index.html'),
        investors: path.resolve(__dirname, 'Business_Modules/investor_module/index.html'),
        rm: path.resolve(__dirname, 'Business_Modules/rm_modules/index.html'),
        customer: path.resolve(__dirname, 'Business_Modules/customer_module/index.html'),
        credit: path.resolve(__dirname, 'Business_Modules/credit_manager/index.html'),
        company: path.resolve(__dirname, 'Business_Modules/company details/index.html'),
        master: path.resolve(__dirname, 'Master_Module/index.html'),
      },
    },
  },
});