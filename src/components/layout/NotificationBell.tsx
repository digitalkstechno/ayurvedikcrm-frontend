"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FiBell,
  FiClock,
  FiUser,
  FiCheck,
  FiX,
  FiUsers,
  FiPackage,
  FiTruck,
  FiRotateCcw,
  FiTag,
  FiCalendar,
  FiShoppingBag,
  FiFileText,
} from "react-icons/fi";
import { DoneAll, History } from "@mui/icons-material";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationItem,
} from "../../services/notificationService";
import { usePermission } from "../../utils/permissionUtils";

const formatDDMMYYYY = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "";
  }
};

const getCategoryIcon = (category: string) => {
  switch (category?.toUpperCase()) {
    case "LEAD":
      return <FiUsers className="w-4 h-4" />;
    case "ORDER":
      return <FiShoppingBag className="w-4 h-4" />;
    case "DELIVERY":
      return <FiTruck className="w-4 h-4" />;
    case "REMINDER":
      return <FiCalendar className="w-4 h-4" />;
    case "RETURN ORDER":
      return <FiRotateCcw className="w-4 h-4" />;
    case "COURIER":
      return <FiPackage className="w-4 h-4" />;
    case "TEAM":
      return <FiUser className="w-4 h-4" />;
    case "MASTER":
      return <FiTag className="w-4 h-4" />;
    default:
      return <FiFileText className="w-4 h-4" />;
  }
};

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const LIMIT = 20;

  const loadNotifications = useCallback(async (pageToLoad = 1, append = false) => {
    if (typeof window === "undefined" || !localStorage.getItem("wrixty_token")) return;
    try {
      const res = await fetchNotifications(pageToLoad, LIMIT);
      const incoming = res?.data || [];
      setNotifications((prev) => {
        if (!append) return incoming;
        const existingIds = new Set(prev.map((item) => item._id));
        return [...prev, ...incoming.filter((item) => !existingIds.has(item._id))];
      });
      setUnreadCount(res?.unreadCount || 0);
      setPage(pageToLoad);
      setHasMore(Boolean(res?.hasMore));
    } catch {
      // Ignore transient errors; 401 is handled by api interceptor
    }
  }, []);

  useEffect(() => {
    loadNotifications(1, false);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      await loadNotifications(1, false);
      setLoading(false);
    }
  };

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading || loadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      setLoadingMore(true);
      await loadNotifications(page + 1, true);
      setLoadingMore(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        title="Notifications"
        className="relative w-9 h-9 rounded-lg bg-primary-teal/10 border border-primary-teal/20 text-primary-teal hover:bg-primary-teal/15 flex items-center justify-center transition-all"
      >
        <FiBell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-card-bg" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[360px] sm:w-[400px] bg-card-bg border border-border-ui rounded-xl shadow-soft z-50 overflow-hidden animate-fade-in font-nunito">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-ui/60 bg-card-bg">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-teal text-white">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-bold text-primary-teal hover:opacity-80 transition-opacity"
                >
                  <DoneAll style={{ fontSize: 15 }} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-secondary hover:text-text-primary p-0.5 rounded transition-colors"
                aria-label="Close notifications"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification Items */}
          <div
            onScroll={handleScroll}
            className="max-h-[380px] overflow-y-auto divide-y divide-border-ui/50"
          >
            {loading && notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-text-secondary">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-text-secondary">
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${item.isRead ? "bg-card-bg" : "bg-primary-teal/[0.03]"
                    } hover:bg-background/60`}
                >
                  <div className="relative w-9 h-9 rounded-lg bg-primary-teal/10 border border-primary-teal/15 text-primary-teal flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(item.module || item.category || "")}
                    {!item.isRead && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary-teal ring-2 ring-card-bg" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-extrabold text-text-primary leading-snug">
                        {item.title}
                      </h4>
                      <span className="shrink-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border border-border-ui bg-background text-text-secondary">
                        {item.module || item.category || "GENERAL"}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed break-words">
                      {item.message}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-text-secondary/80">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex items-center gap-1 shrink-0">
                          <FiClock className="w-3 h-3" />
                          {formatDDMMYYYY(item.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <FiUser className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.sender?.name || item.sender?.email || item.actorName || "System"}</span>
                        </span>
                      </div>
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(item._id)}
                          title="Mark as read"
                          className="text-text-secondary hover:text-primary-teal p-1 rounded transition-colors shrink-0"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loadingMore && (
              <div className="py-3 text-center text-[11px] text-text-secondary">
                Loading more...
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
