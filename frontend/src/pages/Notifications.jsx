import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import api from "../services/api";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useAddressTranslations } from "../hooks/useAddressTranslations.js";
import {
  extractNotificationAddresses,
  localizeNotification,
} from "../utils/notificationText.js";
import "../css/global.css";
import "../css/navbar.css";
import "../css/modules.css";

export default function Notifications() {
  const i18n = useLanguage();
  const { t, formatDate, formatClock, lang } = i18n;
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    api.notifications.list()
      .then((res) => { if (!cancelled) setItems(res?.data ?? []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  // Notification templates can contain property addresses. Translate those
  // fragments with the same cached address API used by the rest of the app.
  const notificationAddresses = useMemo(
    () => extractNotificationAddresses(items ?? []),
    [items]
  );
  const translatedAddresses = useAddressTranslations(
    notificationAddresses,
    lang === "bn"
  );

  const markAll = () =>
    api.notifications.markAllRead()
      .then(() => setItems((list) => (list ?? []).map((n) => ({ ...n, is_read: true }))))
      .catch(() => {});

  const open = (n) => {
    if (!n.is_read) {
      api.notifications.markRead(n.notification_id).catch(() => {});
      setItems((list) => (list ?? []).map((item) =>
        item.notification_id === n.notification_id
          ? { ...item, is_read: true }
          : item
      ));
    }
    if (n.link_url && n.link_url.startsWith("/") && n.link_url !== "/notifications") {
      navigate(n.link_url);
    }
  };

  const shown = (items ?? []).filter((n) => filter === "all" || !n.is_read);
  const unread = (items ?? []).filter((n) => !n.is_read).length;

  return (
    <div className="module-shell">
      <AppNavbar />
      <main className="module-main">
        <h1 className="module-title">{t("notif.pageTitle")}</h1>
        <div className="fx-actions" style={{ margin: "1rem 0", justifyContent: "space-between" }}>
          <div className="mt-filter">
            {["all", "unread"].map((key) => (
              <button
                key={key}
                type="button"
                className={`pill-tab ${filter === key ? "is-active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {t(`notif.filter.${key}`)}{key === "unread" ? ` (${i18n.digits(unread)})` : ""}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={markAll}>
              <CheckCheck size={14} /> {t("notif.markAllRead")}
            </button>
          )}
        </div>
        <div className="mod-card">
          {items === null ? (
            <p className="fx-help" style={{ padding: 16 }}>{t("common.loading")}</p>
          ) : shown.length === 0 ? (
            <p className="fx-help" style={{ padding: 16 }}>{t("notif.empty")}</p>
          ) : shown.map((notification) => {
            const localized = localizeNotification(notification, i18n, translatedAddresses);
            return (
              <button
                key={notification.notification_id}
                type="button"
                className={`np-item ${notification.is_read ? "is-read" : ""}`}
                onClick={() => open(notification)}
              >
                <span className="np-dot" aria-hidden="true" />
                <span>
                  <span className="np-title">{localized.title}</span>
                  <br />
                  {localized.message}
                  <br />
                  <span className="np-time">
                    {formatDate(notification.created_at, "medium")} · {formatClock(notification.created_at)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </main>
      <footer className="site-footer">
        <div className="container"><p>{t("footer.brand")}</p></div>
      </footer>
    </div>
  );
}
