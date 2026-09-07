const routes = [
  { prefix: "/Agent", file: "/Business_Modules/agent_module/index.html" },
  { prefix: "/backoffice", file: "/Business_Modules/back_office/index.html" },
  { prefix: "/investors", file: "/Business_Modules/investor_module/index.html" },
  { prefix: "/rm", file: "/Business_Modules/rm_modules/index.html" },
  { prefix: "/client", file: "/Business_Modules/customer_module/index.html" },
  { prefix: "/dashboard", file: "/Business_Modules/customer_module/index.html" },
  { prefix: "/my-loan", file: "/Business_Modules/customer_module/index.html" },
  { prefix: "/emi-history", file: "/Business_Modules/customer_module/index.html" },
  { prefix: "/profile", file: "/Business_Modules/customer_module/index.html" },
  { prefix: "/credit", file: "/Business_Modules/credit_manager/index.html" },
  { prefix: "/company", file: "/Business_Modules/company details/index.html" },
  { prefix: "/master", file: "/Master_Module/index.html" },
  { prefix: "/Master_Module", file: "/Master_Module/index.html" },
  { prefix: "/login", file: "/Core/index.html" },
  { prefix: "/verify", file: "/Core/index.html" },
  { prefix: "/signup", file: "/Core/index.html" },
  { prefix: "/otp", file: "/Core/index.html" }
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Root URL → Core application
    if (pathname === "/") {
      return env.ASSETS.fetch(
        new Request(new URL("/Core/index.html", request.url), request)
      );
    }

    // Application routes FIRST
    for (const route of routes) {
      if (
        pathname === route.prefix ||
        pathname.startsWith(route.prefix + "/")
      ) {
        return env.ASSETS.fetch(
          new Request(new URL(route.file, request.url), request)
        );
      }
    }

    // Static assets/files
    return env.ASSETS.fetch(request);
  }
};