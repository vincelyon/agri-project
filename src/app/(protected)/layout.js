import { requireUser } from "@/lib/auth.js";
import { can } from "@/lib/permissions.js";
import { getSettings } from "@/services/settings.js";
import { logoutAction } from "@/app/actions/auth.js";
import { Sidebar } from "@/components/layout/Sidebar.jsx";
import { TopBar } from "@/components/layout/TopBar.jsx";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }) {
  const user = await requireUser();
  const settings = await getSettings();

  // Mini scope: core stock flow only. Hidden routes still exist but are not linked.
  // Every page and service re-checks permissions on the server.
  const groups = [
    {
      heading: "Overview",
      links: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/inventory", label: "Inventory" },
      ],
    },
    {
      heading: "Stock",
      links: [
        { href: "/stock/in", label: "Stock in" },
        { href: "/stock/out", label: "Stock out" },
      ],
    },
    {
      heading: "Catalog",
      links: [
        { href: "/products", label: "Products" },
        { href: "/categories", label: "Categories" },
      ],
    },
    ...(can(user, "users:manage")
      ? [
          {
            heading: "Administration",
            links: [
              { href: "/users", label: "Users" },
              { href: "/settings", label: "Settings" },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <Sidebar shopName={settings.shopName} items={groups} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          shopName={settings.shopName}
          user={{ name: user.name, role: user.role }}
          logoutAction={logoutAction}
        />
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <div className="agri-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
