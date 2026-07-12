import { useEffect, useRef, useState } from "react";
import { apiClient } from "../../lib/api-client";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../../lib/auth-context";
import "./notification-bell.css";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    apiClient.get<Notification[]>("/notifications").then((res) => setNotifications(res.data));

    const socket = getSocket();
    socket.connect();
    socket.emit("join", user.id);
    socket.on("notification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => {
      socket.off("notification");
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      // best-effort; the badge will reconcile on next load
    }
  }

  return (
    <div className="notification-bell" id="notification-bell" data-tour="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell__trigger"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-bell__panel">
          {notifications.length === 0 && <p className="notification-bell__empty">No notifications yet.</p>}
          {notifications.map((n) => (
            <button
              type="button"
              key={n.id}
              className={"notification-bell__item" + (n.isRead ? "" : " is-unread")}
              onClick={() => handleMarkRead(n.id)}
            >
              <span className="notification-bell__item-title">{n.title}</span>
              <span className="notification-bell__item-body">{n.body}</span>
              <span className="notification-bell__item-time">{new Date(n.createdAt).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
