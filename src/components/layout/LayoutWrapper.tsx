"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated as checkIsAuthenticated, getAuthenticatedUser, clearAuthData } from "../../utils/authUtils";
import { useSettings } from "../../context/SettingsContext";

import { ToastProvider } from "../../context/ToastContext";
import {
  Dashboard as DashboardIcon,
  People,
  RestoreFromTrash,
  ShoppingCart,
  History,
  Notifications,
  AssignmentReturn,
  LocalShipping,
  Assessment,
  Badge,
  Security,
  Groups,
  Palette,
  ShoppingBag,
  Category,
  Person,
  Menu,
  Close,
  Logout,
  KeyboardArrowDown,
  KeyboardArrowRight,
  Apps,
  Spa,
  Description,
  ViewKanban
} from "@mui/icons-material";

export const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    avatar: string;
    check_photo?: string;
    permissions?: Record<string, boolean>;
  } | null>(null);

  const { settings } = useSettings();

  // Collapsible Submenu states
  const [teamOpen, setTeamOpen] = useState(false);
  const [masterOpen, setMasterOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Helper to check permission with Superadmin / Admin role & email bypass
  const hasPermission = (perm: string) => {
    const u = getAuthenticatedUser();
    if (!u) return false;
    try {
      const roles = u.roles || [];
      const isBypass = roles.some((r: string) =>
        r.toLowerCase() === 'superadmin'
      ) || u.email?.toLowerCase() === 'superadmin@gmail.com';

      if (isBypass) return true;
      return !!u.permissions?.[perm];
    } catch (e) {
      return false;
    }
  };

  // Initialize theme and auth status
  useEffect(() => {
    // Auth Check
    const auth = checkIsAuthenticated();
    const isPublicPath = pathname === "/login" || pathname === "/" || pathname === "/forgot-password" || pathname === "/reset-password";

    if (!auth && !isPublicPath) {
      router.push("/login");
    } else if (auth) {
      setIsAuthenticated(true);
      const u = getAuthenticatedUser();
      if (u) {
        try {
          setCurrentUser({
            name: u.name || "Admin",
            email: u.email || "superadmin@gmail.com",
            avatar: u.name ? u.name.charAt(0).toUpperCase() : "A",
            check_photo: u.check_photo,
            permissions: u.permissions || {}
          });
        } catch (e) { }
      } else {
        setCurrentUser({
          name: "Admin",
          email: "superadmin@gmail.com",
          avatar: "A",
          permissions: {}
        });
      }
      if (pathname === "/login") {
        router.push("/dashboard");
      }
    }
  }, [pathname, router]);

  const handleLogout = () => {
    clearAuthData();
    setIsAuthenticated(false);
    router.push("/login");
  };

  if (pathname === "/login" || pathname === "/" || pathname === "/forgot-password" || pathname === "/reset-password") {
    return (
      <ToastProvider>
        {children}
      </ToastProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-background flex items-center justify-center text-text-primary font-sans">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-teal"></div>
        </div>
      </ToastProvider>
    );
  }

  const renderLink = (name: string, path: string, icon: React.ReactNode) => {
    const active = pathname === path;
    return (
      <Link
        key={path}
        href={path}
        prefetch={false}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium capitalize tracking-wide transition-all duration-205 ${active
          ? "bg-gradient-primary text-white shadow-md font-semibold"
          : "text-text-secondary hover:bg-background hover:text-text-primary"
          }`}
      >
        {icon}
        <span>{name}</span>
      </Link>
    );
  };

  const renderSubLink = (name: string, path: string) => {
    const active = pathname === path;
    return (
      <Link
        key={path}
        href={path}
        prefetch={false}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${active
          ? "text-primary-teal font-bold bg-primary-teal/5"
          : "text-text-secondary hover:text-text-primary"
          }`}
      >
        <span>{name}</span>
      </Link>
    );
  };

  return (
    <ToastProvider>
      <div className="h-screen w-screen flex overflow-hidden bg-background text-text-primary font-sans transition-all duration-300">

        {/* Desktop Sidebar (Fixed & Independent Scrolling area) */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-border-ui bg-card-bg shrink-0 h-full overflow-hidden">
          <div className="h-16 flex items-center px-6 border-b border-border-ui shrink-0 gap-2 bg-gradient-to-b from-primary-teal/5 to-transparent">
            {settings.appLogo ? (
              <img src={settings.appLogo} alt="Logo" className="w-46 h-46 object-contain" />
            ) : (
              <Spa className="text-primary-teal w-18 h-18" />
            )}
            {/* <span className="font-extrabold text-lg tracking-wider text-gradient-primary font-sans line-clamp-1">
              {settings.appName}
            </span> */}
          </div>

          {/* Sidebar navigation list: matches screenshot exactly */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 no-scrollbar">
            {hasPermission("Dashboard-view") && renderLink("Dashboards", "/dashboard", <DashboardIcon className="w-4.5 h-4.5" />)}
            {hasPermission("Lead-list") && renderLink("Lead", "/lead-list", <People className="w-4.5 h-4.5" />)}
            {hasPermission("Kanban-view") && renderLink("Kanban", "/kanban-list", <ViewKanban className="w-4.5 h-4.5" />)}
            {/* {hasPermission("Restore-lead-list") && renderLink("Restore Lead", "/restore-data", <RestoreFromTrash className="w-4.5 h-4.5" />)} */}
            {hasPermission("Order-edit") && renderLink("Order", "/order-list", <ShoppingCart className="w-4.5 h-4.5" />)}
            {hasPermission("Delivery-full-access") && renderLink("Delivery", "/delivery-list", <LocalShipping className="w-4.5 h-4.5" />)}
            {hasPermission("Activity-log") && renderLink("Activity Log", "/activity-log", <History className="w-4.5 h-4.5" />)}
            {/* {hasPermission("Lead-try") && renderLink("Lead Try", "/task-list", <Description className="w-4.5 h-4.5" />)} */}
            {hasPermission("Reminder-list") && renderLink("Reminder List", "/reminder-list", <Notifications className="w-4.5 h-4.5" />)}
            {hasPermission("Return-order-list") && renderLink("Return Order", "/return-order", <AssignmentReturn className="w-4.5 h-4.5" />)}
            {hasPermission("Currier-list") && renderLink("Courier", "/currier-list", <LocalShipping className="w-4.5 h-4.5" />)}
            {hasPermission("Return-order-report-view") && renderLink("Return Order Report", "/staff-return-order-list", <Assessment className="w-4.5 h-4.5" />)}

            {/* Collapsible Team Member Menu */}
            {(hasPermission("User-list") || hasPermission("Roles-list") || hasPermission("Team-list")) && (
              <div className="space-y-1 text-left">
                <button
                  onClick={() => setTeamOpen(!teamOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium capitalize tracking-wide text-text-secondary hover:bg-background transition-all duration-200"
                >
                  <div className="flex items-center gap-3.5">
                    <Groups className="w-4.5 h-4.5" />
                    <span>Team Member</span>
                  </div>
                  {teamOpen ? <KeyboardArrowDown className="w-4 h-4" /> : <KeyboardArrowRight className="w-4 h-4" />}
                </button>
                {teamOpen && (
                  <div className="border-l-2 border-primary-teal/50 ml-6 pl-4 space-y-1 animate-fade-in text-left">
                    {hasPermission("User-list") && renderSubLink("User", "/users")}
                    {hasPermission("Roles-list") && renderSubLink("Role", "/roles-list")}
                    {hasPermission("Team-list") && renderSubLink("Team", "/team-list")}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Master Menu */}
            {(hasPermission("Status-list") || hasPermission("Product-list") || hasPermission("Return-order-type-list") || hasPermission("Reason-to-call-list")) && (
              <div className="space-y-1 text-left">
                <button
                  onClick={() => setMasterOpen(!masterOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium capitalize tracking-wide text-text-secondary hover:bg-background transition-all duration-200"
                >
                  <div className="flex items-center gap-3.5">
                    <Security className="w-4.5 h-4.5" />
                    <span>Master</span>
                  </div>
                  {masterOpen ? <KeyboardArrowDown className="w-4 h-4" /> : <KeyboardArrowRight className="w-4 h-4" />}
                </button>
                {masterOpen && (
                  <div className="border-l-2 border-primary-teal/50 ml-6 pl-4 space-y-1 animate-fade-in text-left">
                    {hasPermission("Status-list") && renderSubLink("Status", "/status")}
                    {hasPermission("Product-list") && renderSubLink("Product", "/product")}
                    {hasPermission("Return-order-type-list") && renderSubLink("Return Order Type", "/return-order-type")}
                    {hasPermission("Reason-to-call-list") && renderSubLink("Reason to Call", "/reason-to-call")}
                    {hasPermission("Status-list") && renderSubLink("Customer", "/customer")}
                    {/* Add Settings Link for Admins */}
                    {hasPermission("Dashboard-view") && renderSubLink("System Settings", "/system-settings")}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-border-ui shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold uppercase tracking-wider text-error hover:bg-error/5 transition-all border border-error/20"
            >
              <Logout className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Panel */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex h-full">
            <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
            <aside className="relative flex flex-col w-64 max-w-xs bg-card-bg border-r border-border-ui animate-slide-in h-full overflow-hidden">
              <div className="h-16 flex items-center px-6 border-b border-border-ui shrink-0 gap-2">
                {settings.appLogo ? (
                  <img src={settings.appLogo} alt="Logo" className="w-36 h-auto max-h-12 object-contain" />
                ) : (
                  <Spa className="text-primary-teal w-8 h-8" />
                )}
                <span className="font-extrabold text-lg text-gradient-primary line-clamp-1">{settings.appName}</span>
                <button onClick={() => setSidebarOpen(false)} className="ml-auto text-text-secondary hover:text-text-primary">
                  <Close className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 no-scrollbar">
                {hasPermission("Dashboard-view") && renderLink("Dashboards", "/dashboard", <DashboardIcon className="w-4.5 h-4.5" />)}
                {hasPermission("Lead-list") && renderLink("Lead", "/lead-list", <People className="w-4.5 h-4.5" />)}
                {hasPermission("Kanban-view") && renderLink("Kanban", "/kanban-list", <ViewKanban className="w-4.5 h-4.5" />)}
                {hasPermission("Restore-lead-list") && renderLink("Restore Lead", "/restore-data", <RestoreFromTrash className="w-4.5 h-4.5" />)}
                {hasPermission("Order-edit") && renderLink("Order", "/order-list", <ShoppingCart className="w-4.5 h-4.5" />)}
                {hasPermission("Delivery-full-access") && renderLink("Delivery", "/delivery-list", <LocalShipping className="w-4.5 h-4.5" />)}
                {hasPermission("Activity-log") && renderLink("Activity Log", "/activity-log", <History className="w-4.5 h-4.5" />)}
                {hasPermission("Lead-try") && renderLink("Task List", "/task-list", <Description className="w-4.5 h-4.5" />)}
                {hasPermission("Reminder-list") && renderLink("Reminder List", "/reminder-list", <Notifications className="w-4.5 h-4.5" />)}
                {hasPermission("Return-order-list") && renderLink("Return Order", "/return-order", <AssignmentReturn className="w-4.5 h-4.5" />)}
                {hasPermission("Currier-list") && renderLink("Courier", "/currier-list", <LocalShipping className="w-4.5 h-4.5" />)}
                {hasPermission("Return-order-report-view") && renderLink("Return Order Report", "/staff-return-order-list", <Assessment className="w-4.5 h-4.5" />)}

                {/* Collapsible Mobile Team Member */}
                {(hasPermission("User-list") || hasPermission("Roles-list") || hasPermission("Team-list")) && (
                  <div className="space-y-1 text-left">
                    <button
                      onClick={() => setTeamOpen(!teamOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[13px] font-medium capitalize tracking-wide text-text-secondary hover:bg-background transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5">
                        <Groups className="w-4.5 h-4.5" />
                        <span>Team Member</span>
                      </div>
                      {teamOpen ? <KeyboardArrowDown className="w-4 h-4" /> : <KeyboardArrowRight className="w-4 h-4" />}
                    </button>
                    {teamOpen && (
                      <div className="border-l-2 border-primary-teal/50 ml-6 pl-4 space-y-1 animate-fade-in text-left">
                        {hasPermission("User-list") && renderSubLink("User", "/users")}
                        {hasPermission("Roles-list") && renderSubLink("Role", "/roles-list")}
                        {hasPermission("Team-list") && renderSubLink("Team", "/team-list")}
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Mobile Master */}
                {(hasPermission("Status-list") || hasPermission("Product-list") || hasPermission("Return-order-type-list") || hasPermission("Reason-to-call-list")) && (
                  <div className="space-y-1 text-left">
                    <button
                      onClick={() => setMasterOpen(!masterOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[13px] font-medium capitalize tracking-wide text-text-secondary hover:bg-background transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5">
                        <Security className="w-4.5 h-4.5" />
                        <span>Master</span>
                      </div>
                      {masterOpen ? <KeyboardArrowDown className="w-4 h-4" /> : <KeyboardArrowRight className="w-4 h-4" />}
                    </button>
                    {masterOpen && (
                      <div className="border-l-2 border-primary-teal/50 ml-6 pl-4 space-y-1 animate-fade-in text-left">
                        {hasPermission("Status-list") && renderSubLink("Status", "/status")}
                        {hasPermission("Product-list") && renderSubLink("Product", "/product")}
                        {hasPermission("Return-order-type-list") && renderSubLink("Return Order Type", "/return-order-type")}
                        {hasPermission("Reason-to-call-list") && renderSubLink("Reason to Call", "/reason-to-call")}
                        {hasPermission("Status-list") && renderSubLink("Customer", "/customer")}
                        {hasPermission("Dashboard-view") && renderSubLink("System Settings", "/system-settings")}
                      </div>
                    )}
                  </div>
                )}
              </nav>

              <div className="p-4 border-t border-border-ui shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-error hover:bg-error/5 transition-all border border-error/20"
                >
                  <Logout className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Right-side Main Content View (Sticky Header + Independent Scroll content) */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Global Sticky Header with Glassmorphism, Premium Alignment, and Motion */}
          <header className="h-16 flex items-center justify-between px-6 border-b border-border-ui/50 bg-card-bg/80 backdrop-blur-md sticky top-0 z-40 shrink-0 transition-all duration-300">
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary-teal/20 to-transparent"></div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-text-secondary hover:text-text-primary transition-all active:scale-95 duration-150"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:flex items-center gap-3">
              {/* <span className="text-xs font-medium text-primary-teal bg-primary-teal/5 px-3 py-1 rounded-full border border-primary-teal/10 shadow-soft transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
                  Super Admin
                </span> */}
              {/* <span className="text-border-ui">/</span> */}
              <span className="text-xs font-bold text-text-primary transition-all cursor-pointer capitalize">
                {pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Dashboard"}
              </span>
            </div>

            {/* Exact Right Header User Info display matching screenshot */}
            <div className="flex items-center gap-5 relative" ref={profileDropdownRef}>
              <div
                className="flex items-center gap-3 p-1 group cursor-pointer"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                {currentUser?.check_photo ? (
                  <img src={currentUser.check_photo} alt="Avatar" className="w-9 h-9 rounded-lg object-cover shadow-md transition-all duration-300 group-hover:scale-105 group-hover:rotate-3" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-gradient-primary text-white font-bold text-xs flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
                    {currentUser?.avatar || "A"}
                  </div>
                )}
                <div className="flex flex-col text-left transition-all duration-200 group-hover:translate-x-0.5">
                  <span className="text-xs font-bold text-text-primary">{currentUser?.name || "Admin"}</span>
                  <span className="text-[10px] text-text-secondary font-semibold tracking-wide">{currentUser?.email || "superadmin@gmail.com"}</span>
                </div>
              </div>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute top-12 right-0 w-48 bg-card-bg border border-border-ui rounded-lg shadow-soft py-2 z-50 animate-fade-in">
                  <Link
                    href="/profile-details"
                    prefetch={false}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-background text-sm text-text-primary font-medium transition-colors"
                  >
                    <Person className="w-4.5 h-4.5 text-text-secondary" />
                    Account
                  </Link>
                  <div className="h-px bg-border-ui/50 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-error/5 text-sm text-error font-medium transition-colors"
                  >
                    <Logout className="w-4.5 h-4.5" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Scrollable Page body: Scrolls independently of Sidebar */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-background">
            {children}
          </main>
        </div>

      </div>
    </ToastProvider>
  );
};
