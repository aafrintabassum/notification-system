// ─────────────────────────────────────────────────────────────
//  App.js  –  Root component
//
//  Owns ALL state so no prop-drilling mess:
//    buckets      { email:[], sms:[], push:[] }  in-memory store
//    newIds       Set<string>  ids that just arrived  (for highlight)
//    loading      bool         first-fetch in progress
//    error        string|null  last fetch error
//    activeFilter null | "email" | "sms" | "push"
//    currentPage  number
//
//  Polling:
//    setInterval every 10 s → getNotifications() → merge into buckets
//
//  No database, no localStorage, everything lives here.
// ─────────────────────────────────────────────────────────────

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";

import "./App.css";
import { getNotifications, postNotification } from "./services/api";
import FilterBar        from "./components/FilterBar";
import NotificationList from "./components/NotificationList";

// ── Constants ──────────────────────────────────────────────
const POLL_MS    = 10_000;   // poll interval
const MAX_WINDOW = 10;       // keep only the latest N per channel
const CHANNELS   = ["email", "sms", "push"];

// ── Pure helper: merge API response into in-memory buckets ──
//
//  Rules applied here:
//   • Deduplicate by id  (seenIds Set, mutated in place)
//   • Sort newest-first
//   • Slice to MAX_WINDOW (oldest fall off → sliding window)
//
function mergeIntoStore(currentBuckets, incoming, seenIds) {
  const freshIds = new Set();

  // Clone existing arrays so we never mutate state directly
  const draft = {
    email: [...currentBuckets.email],
    sms:   [...currentBuckets.sms],
    push:  [...currentBuckets.push],
  };

  for (const item of incoming) {
    const ch = (item.type || "").toLowerCase();
    if (!CHANNELS.includes(ch)) continue;   // unknown channel – ignore
    if (seenIds.has(item.id))   continue;   // duplicate – ignore

    seenIds.add(item.id);
    freshIds.add(item.id);
    draft[ch].push(item);
  }

  // Sort + trim every channel
  const next = {};
  for (const ch of CHANNELS) {
    next[ch] = draft[ch]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, MAX_WINDOW);
  }

  return { next, freshIds };
}

// ── App ────────────────────────────────────────────────────
function App() {
  const [buckets,      setBuckets]     = useState({ email: [], sms: [], push: [] });
  const [newIds,       setNewIds]      = useState(new Set());
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState(null);
  const [activeFilter, setActiveFilter]= useState(null);
  const [currentPage,  setCurrentPage] = useState(1);
  const [lastUpdated,  setLastUpdated] = useState(null);

  // seenIds lives in a ref → persists across renders, never triggers one
  const seenIds = useRef(new Set());

  // ── Fetch & merge ─────────────────────────────────────────
  const fetchAndMerge = useCallback(async () => {
    try {
      const params = {
        limit: 50,          // fetch plenty so the sliding window has material
        page:  currentPage,
        ...(activeFilter ? { notification_type: activeFilter } : {}),
      };

      const raw = await getNotifications(params);
      setError(null);

      setBuckets(prev => {
        const { next, freshIds } = mergeIntoStore(prev, raw, seenIds.current);

        // Highlight freshly arrived items, then clear after 4 s
        if (freshIds.size > 0) {
          setNewIds(freshIds);
          setTimeout(() => setNewIds(new Set()), 4000);
        }

        return next;
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Could not reach the notification service.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeFilter]);

  // ── Polling: run immediately, then every POLL_MS ──────────
  useEffect(() => {
    fetchAndMerge();                               // first call right away
    const timer = setInterval(fetchAndMerge, POLL_MS);
    return () => clearInterval(timer);             // cleanup on unmount
  }, [fetchAndMerge]);

  // ── Handle form submission (inject local notification) ────
  const handleAddNotification = useCallback(async (payload) => {
    const notif = await postNotification(payload);   // from api.js

    const ch = notif.type.toLowerCase();
    if (!CHANNELS.includes(ch)) return;

    seenIds.current.add(notif.id);                 // don't re-add on next poll

    setBuckets(prev => {
      const updated = [notif, ...prev[ch]].slice(0, MAX_WINDOW);
      return { ...prev, [ch]: updated };
    });

    setNewIds(new Set([notif.id]));
    setTimeout(() => setNewIds(new Set()), 4000);
  }, []);

  // ── Status text / class ───────────────────────────────────
  const statusInfo = useMemo(() => {
    if (error)   return { cls: "app__status--error",   text: `⚠ ${error}` };
    if (loading) return { cls: "app__status--loading", text: "Connecting to notification service…" };
    return {
      cls:  "app__status--live",
      text: `Live · Auto-refresh every 10 s${lastUpdated ? " · Updated " + lastUpdated.toLocaleTimeString("en-IN") : ""}`,
    };
  }, [error, loading, lastUpdated]);

  // ── Check if we have any data yet ────────────────────────
  const hasData = CHANNELS.some(ch => buckets[ch].length > 0);

  // ── Render ────────────────────────────────────────────────
  return (
    <main className="app">

      {/* Page header */}
      <header className="app__header">
        <p className="app__eyebrow">Real-time · Campus Notification Centre</p>
        <h1 className="app__title">Notification Dashboard</h1>
        <p className="app__subtitle">
          Email · SMS · Push &nbsp;|&nbsp; Latest 10 per channel &nbsp;|&nbsp; Grouped by type
        </p>
      </header>

      {/* Status strip */}
      <div className={`app__status ${statusInfo.cls}`} role="status" aria-live="polite">
        <span className="status-dot" aria-hidden="true" />
        {statusInfo.text}
      </div>

      {/* Controls: filter + pagination + add-form */}
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onAddNotification={handleAddNotification}
      />

      {/* Main content */}
      {loading && !hasData ? (
        <div className="app__loading" aria-label="Loading notifications">
          <div className="app__spinner" />
          <p className="app__loading-text">Fetching notifications…</p>
        </div>
      ) : (
        <NotificationList
          buckets={buckets}
          newIds={newIds}
          activeFilter={activeFilter}
        />
      )}

    </main>
  );
}

export default App;
