import { useEffect, useRef, useState } from "react";

import {
  Activity,
  BookOpen,
  History,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const navigation = [
  { to: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { to: "/investigation-history", label: "Investigation History", icon: History },
  {
    to: "/",
    label: "Overview",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/incidents",
    label: "Incidents",
    icon: FileText,
  },
  {
    to: "/model-comparison",
    label: "Model Comparison",
    icon: FlaskConical,
    adminOnly: true,
  },
  {
    to: "/users",
    label: "Users",
    icon: UsersRound,
    adminOnly: true,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings2,
  },
  {
    to: "/profile",
    label: "Profile",
    icon: UserRound,
  },
];

const iconButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-md " +
  "text-text-secondary transition-colors hover:bg-elevated " +
  "hover:text-text-primary focus-visible:outline " +
  "focus-visible:outline-2 focus-visible:outline-accent";

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileTriggerRef = useRef(null);
  const mobileCloseRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileCloseRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        sidebarRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex="0"]'
        ) || []
      ).filter((element) => element.getClientRects().length > 0);

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      mobileTriggerRef.current?.focus();
    };
  }, [mobileOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");

    function handleResize(event) {
      if (event.matches) {
        setMobileOpen(false);
      }
    }

    media.addEventListener("change", handleResize);

    return () => {
      media.removeEventListener("change", handleResize);
    };
  }, []);

  const compact = collapsed && !mobileOpen;

  const visibleNavigation = navigation.filter(
  (item) => !item.adminOnly || isAdmin
);

  const pageLabel =
  location.pathname.startsWith("/knowledge-base")
    ? "Knowledge Base"
    : location.pathname.startsWith("/investigation-history")
    ? "Investigation History"
    : location.pathname === "/"
    ? "Overview"
    : location.pathname.startsWith("/model-comparison")
      ? "Model Comparison"
      : location.pathname.startsWith("/settings")
        ? "Settings"
        : location.pathname.startsWith("/profile")
          ? "Profile"
          : location.pathname.startsWith("/users")
            ? "Users"
            : "Incidents";

  return (
    <div className="min-h-screen bg-canvas">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          tabIndex={-1}
        />
      )}

      <aside
        id="workspace-sidebar"
        ref={sidebarRef}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label="Workspace navigation"
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col",
          "border-r border-line bg-sidebar",
          "transition-[width,transform] duration-150",
          mobileOpen
            ? "visible w-60 translate-x-0"
            : "invisible w-60 -translate-x-full md:visible md:translate-x-0",
          collapsed ? "md:w-[76px]" : "md:w-60",
        ].join(" ")}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-line px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-white">
            <Activity size={22} aria-hidden="true" />
          </div>

          {!compact && (
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                IncidentIQ
              </p>
              <p className="whitespace-nowrap text-[11px] text-text-secondary">
                Engineering Intelligence
              </p>
            </div>
          )}

          <button
            ref={mobileCloseRef}
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className={`${iconButtonClass} ml-auto shrink-0 md:hidden`}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-6"
        >
          {!compact && (
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Workspace
            </p>
          )}

          {visibleNavigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={compact ? label : undefined}
                aria-label={label}
                className={({ isActive }) =>
                  [
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm",
                    "transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-elevated hover:text-text-primary",
                    compact ? "justify-center" : "",
                  ].join(" ")
                }
              >
                <Icon
                  size={18}
                  className="shrink-0"
                  aria-hidden="true"
                />

                {!compact && label}
              </NavLink>
            )
          )}
        </nav>

        <div className="border-t border-line p-3">
          {!compact && (
            <div className="mb-3 px-3">
              <p
                className="truncate text-sm"
                title={user.username}
              >
                {user.username}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {user.role}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-10 w-full items-center justify-center gap-3 rounded-md text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <LogOut size={17} aria-hidden="true" />
            {!compact && "Sign out"}
          </button>
        </div>
      </aside>

      <div
        className={[
          "min-w-0 transition-[padding] duration-150",
          collapsed ? "md:pl-[76px]" : "md:pl-60",
        ].join(" ")}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-canvas px-4 sm:px-8">
          <button
            ref={mobileTriggerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="workspace-sidebar"
            className={`${iconButtonClass} md:hidden`}
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() =>
              setCollapsed((previous) => !previous)
            }
            aria-label={
              collapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            title={
              collapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            className={`${iconButtonClass} hidden md:flex`}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </button>

          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-3 text-sm">
              <li className="hidden text-text-muted sm:block">
                Workspace
              </li>
              <li
                aria-hidden="true"
                className="hidden text-text-muted sm:block"
              >
                /
              </li>
              <li
                aria-current="page"
                className="truncate text-text-primary"
              >
                {pageLabel}
              </li>
            </ol>
          </nav>

          <NavLink
            to="/profile"
            aria-label="Open profile"
            title={user.username}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-elevated text-xs font-semibold text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {user.username.slice(0, 1).toUpperCase()}
          </NavLink>
        </header>

        <main className="mx-auto min-w-0 max-w-[1440px] px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}