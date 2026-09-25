'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { unsubscribeCurrentPush } from '@/lib/push/client';
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Save,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  Clock3,
  Monitor,
  Activity,
  CalendarDays,
  Filter,
  X,
  UserRound,
  MapPin,
  Globe2,
  Layers3,
  Timer,
  MousePointerClick,
  RefreshCw,
} from 'lucide-react';

type Visitor = {
  visitor_id: string;
  session_id: string;
  nickname: string | null;
  first_seen: string;
  last_seen: string;
  visit_count: number;
  pageview_count: number;
  interaction_count: number;
  latest_page: string;
  latest_event: string;
  device: string;
  browser: string;
  os: string;
  country: string;
  region: string;
  city: string;
  ip_masked: string | null;
  ip_full: string | null;
};

type EventRow = {
  id: number;
  session_id?: string | null;
  visitor_id?: string | null;
  page: string;
  event: string;
  referrer: string;
  device: string;
  browser: string;
  os: string;
  country: string;
  region: string;
  city: string;
  ip_masked: string | null;
  created_at: string;
};

type SessionRow = {
  session_id: string;
  visitor_id: string;
  started_at: string;
  last_seen: string;
  device: string;
  browser: string;
  os: string;
  country: string;
  region: string;
  city: string;
  ip_masked: string | null;
  ip_full: string | null;
  created_at: string;
  updated_at: string;
  duration_seconds: number;
  event_count: number;
  events: EventRow[];
};

type VisitorDetail = {
  visitor: Visitor;
  sessions: SessionRow[];
  events: EventRow[];
};

type DateFilter = 'all' | 'today' | '7d' | '30d' | 'custom';

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0s';
  }

  const total = Math.round(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;

  return `${secs}s`;
}

function eventLabel(event: string) {
  return event
    .replace(/^project_view:/, 'Viewed ')
    .replaceAll('_', ' ');
}

function locationLabel(
  country: string,
  region?: string,
  city?: string,
) {
  return [country, region, city].filter(Boolean).join(' · ');
}

function uniqueValues(
  visitors: Visitor[],
  key: keyof Visitor,
) {
  return Array.from(
    new Set(
      visitors
        .map((visitor) => String(visitor[key] ?? '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function dateMatches(
  value: string,
  filter: DateFilter,
  from: string,
  to: string,
) {
  if (filter === 'all') return true;

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return false;
  }

  const now = new Date();

  if (filter === 'today') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  if (filter === '7d') {
    return date.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }

  if (filter === '30d') {
    return date.getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000;
  }

  if (filter === 'custom') {
    const start = from
      ? new Date(`${from}T00:00:00`).getTime()
      : Number.NEGATIVE_INFINITY;

    const end = to
      ? new Date(`${to}T23:59:59.999`).getTime()
      : Number.POSITIVE_INFINITY;

    return date.getTime() >= start && date.getTime() <= end;
  }

  return true;
}

export default function VisitorsManager({ email }: { email: string }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [query, setQuery] = useState('');

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [deviceFilter, setDeviceFilter] = useState('all');
  const [browserFilter, setBrowserFilter] = useState('all');
  const [osFilter, setOsFilter] = useState('all');

  const [showFilters, setShowFilters] = useState(false);

  const [revealed, setRevealed] = useState<Set<string>>(
    new Set(),
  );

  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<
    Record<string, VisitorDetail>
  >({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(
    null,
  );

  const [selectedSession, setSelectedSession] = useState<string | null>(
    null,
  );

  const [editing, setEditing] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setRefreshing(true);

      const res = await fetch('/api/visitors', {
        cache: 'no-store',
      });

      if (res.ok) {
        setVisitors(await res.json());
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();

    const timer = window.setInterval(load, 15000);

    return () => window.clearInterval(timer);
  }, []);

  const devices = useMemo(
    () => uniqueValues(visitors, 'device'),
    [visitors],
  );

  const browsers = useMemo(
    () => uniqueValues(visitors, 'browser'),
    [visitors],
  );

  const operatingSystems = useMemo(
    () => uniqueValues(visitors, 'os'),
    [visitors],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return visitors.filter((visitor) => {
      const matchesSearch =
        !q ||
        [
          visitor.nickname,
          visitor.country,
          visitor.region,
          visitor.city,
          visitor.device,
          visitor.browser,
          visitor.os,
          visitor.latest_page,
          visitor.latest_event,
          visitor.ip_masked,
          visitor.visitor_id,
          visitor.session_id,
        ].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(q),
        );

      const matchesDate = dateMatches(
        visitor.last_seen,
        dateFilter,
        dateFrom,
        dateTo,
      );

      const matchesDevice =
        deviceFilter === 'all' ||
        visitor.device === deviceFilter;

      const matchesBrowser =
        browserFilter === 'all' ||
        visitor.browser === browserFilter;

      const matchesOs =
        osFilter === 'all' ||
        visitor.os === osFilter;

      return (
        matchesSearch &&
        matchesDate &&
        matchesDevice &&
        matchesBrowser &&
        matchesOs
      );
    });
  }, [
    visitors,
    query,
    dateFilter,
    dateFrom,
    dateTo,
    deviceFilter,
    browserFilter,
    osFilter,
  ]);

  const filterCount = [
    dateFilter !== 'all',
    deviceFilter !== 'all',
    browserFilter !== 'all',
    osFilter !== 'all',
  ].filter(Boolean).length;

  function clearFilters() {
    setDateFilter('all');
    setDateFrom('');
    setDateTo('');
    setDeviceFilter('all');
    setBrowserFilter('all');
    setOsFilter('all');
  }

  function beginNickname(visitor: Visitor) {
    setEditing(visitor.visitor_id);
    setNickname(visitor.nickname || '');
    setMessage('');
  }

  async function saveNickname(visitorId: string) {
    setBusy(true);
    setMessage('');

    try {
      const res = await fetch(`/api/visitors/${visitorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(
          json.error || 'Nickname could not be saved.',
        );
        return;
      }

      setVisitors((current) =>
        current.map((visitor) =>
          visitor.visitor_id === visitorId
            ? {
                ...visitor,
                nickname: json.visitor.nickname,
              }
            : visitor,
        ),
      );

      setDetails((current) => {
        const detail = current[visitorId];

        if (!detail) return current;

        return {
          ...current,
          [visitorId]: {
            ...detail,
            visitor: {
              ...detail.visitor,
              nickname: json.visitor.nickname,
            },
          },
        };
      });

      setEditing(null);
      setMessage('Visitor nickname saved.');
    } finally {
      setBusy(false);
    }
  }

  function toggleIp(visitorId: string) {
    setRevealed((current) => {
      const next = new Set(current);

      if (next.has(visitorId)) {
        next.delete(visitorId);
      } else {
        next.add(visitorId);
      }

      return next;
    });
  }

  async function toggleVisitorDetail(visitorId: string) {
    if (expanded === visitorId) {
      setExpanded(null);
      setSelectedSession(null);
      return;
    }

    setExpanded(visitorId);
    setSelectedSession(null);

    if (details[visitorId]) {
      return;
    }

    setLoadingDetail(visitorId);

    try {
      const res = await fetch(`/api/visitors/${visitorId}`, {
        cache: 'no-store',
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        setDetails((current) => ({
          ...current,
          [visitorId]: json,
        }));
      } else {
        setMessage(
          json.error || 'Visitor history could not be loaded.',
        );
      }
    } finally {
      setLoadingDetail(null);
    }
  }

  function toggleSession(sessionId: string) {
    setSelectedSession((current) =>
      current === sessionId ? null : sessionId,
    );
  }

  function resetDetail(visitorId: string) {
    setDetails((current) => {
      const next = { ...current };
      delete next[visitorId];
      return next;
    });
  }

  async function refreshVisitor(
    visitorId: string,
  ) {
    resetDetail(visitorId);
    await toggleVisitorDetail(visitorId);
  }

  async function logout() {
    await unsubscribeCurrentPush();

    const supabase = createClient();
    await supabase.auth.signOut();

    window.location.href = '/login';
  }

  const totalVisits = visitors.reduce(
    (sum, visitor) => sum + visitor.visit_count,
    0,
  );

  const totalViews = visitors.reduce(
    (sum, visitor) => sum + visitor.pageview_count,
    0,
  );

  const totalInteractions = visitors.reduce(
    (sum, visitor) => sum + visitor.interaction_count,
    0,
  );

  return (
    <main className="admin-shell">
      <div className="admin-grid-bg" />

      <header className="admin-topbar">
        <a href="/" className="admin-logo">
          <span>&lt;/&gt;</span> MYLES
          <span className="dot">.</span>
        </a>

        <div className="admin-top-actions">
          <a href="/" target="_blank">
            <ExternalLink size={15} /> View site
          </a>

          <span>{email}</span>

          <button onClick={logout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="sidebar-label">CONTROL ROOM</div>

          <a className="admin-side-link" href="/admin">
            Dashboard
          </a>

          <a
            className="admin-side-link active"
            href="/admin/visitors"
          >
            <Users size={16} /> Visitors
          </a>

          <a className="admin-side-link" href="/admin/projects">
            Projects
          </a>
        </aside>

        <section className="admin-main">
          <div className="admin-heading">
            <div>
              <a className="admin-back" href="/admin">
                <ArrowLeft size={15} /> Back to control room
              </a>

              <span className="eyebrow">03 / AUDIENCE</span>

              <h1>Visitor directory</h1>

              <p>
                Every tracked browser gets a private record. Explore
                visits, sessions, devices, locations, and complete
                activity history.
              </p>
            </div>

            <div className="analytics-card">
              <div>
                <span>TRACKED VISITORS</span>
                <strong>{visitors.length}</strong>
              </div>

              <Users size={20} />
            </div>
          </div>

          {message && (
            <div className="admin-message">
              {message}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div className="analytics-card">
              <div>
                <span>TOTAL VISITS</span>
                <strong>{totalVisits}</strong>
              </div>
              <Layers3 size={19} />
            </div>

            <div className="analytics-card">
              <div>
                <span>PAGE VIEWS</span>
                <strong>{totalViews}</strong>
              </div>
              <Globe2 size={19} />
            </div>

            <div className="analytics-card">
              <div>
                <span>INTERACTIONS</span>
                <strong>{totalInteractions}</strong>
              </div>
              <MousePointerClick size={19} />
            </div>

            <div className="analytics-card">
              <div>
                <span>SHOWING</span>
                <strong>{filtered.length}</strong>
              </div>
              <Filter size={19} />
            </div>
          </div>

          <div className="admin-panel visitor-directory-panel">
            <div className="panel-title">
              <strong>People who have visited</strong>

              <span>
                {refreshing ? 'refreshing...' : 'updates every 15s'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: 14,
              }}
            >
              <div
                className="visitor-search-wrap"
                style={{ flex: '1 1 320px', marginBottom: 0 }}
              >
                <Search size={16} />

                <input
                  className="visitor-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, ID, location, device, page, event or IP..."
                />
              </div>

              <button
                type="button"
                className="admin-secondary"
                onClick={() => setShowFilters((current) => !current)}
              >
                <Filter size={14} />
                Filters
                {filterCount > 0 && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      fontSize: 11,
                    }}
                  >
                    {filterCount}
                  </span>
                )}
                {showFilters ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>

              <button
                type="button"
                className="admin-secondary"
                onClick={load}
                disabled={refreshing}
                title="Refresh visitor directory"
              >
                <RefreshCw
                  size={14}
                  style={{
                    animation: refreshing
                      ? 'spin 1s linear infinite'
                      : undefined,
                  }}
                />
                Refresh
              </button>
            </div>

            {showFilters && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: 10,
                  padding: 14,
                  marginBottom: 16,
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.025)',
                }}
              >
                <label
                  style={{
                    display: 'grid',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span className="eyebrow">TIME RANGE</span>

                  <select
                    value={dateFilter}
                    onChange={(e) =>
                      setDateFilter(
                        e.target.value as DateFilter,
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.25)',
                      color: 'inherit',
                    }}
                  >
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="custom">Custom range</option>
                  </select>
                </label>

                <label
                  style={{
                    display: 'grid',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span className="eyebrow">DEVICE</span>

                  <select
                    value={deviceFilter}
                    onChange={(e) =>
                      setDeviceFilter(e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.25)',
                      color: 'inherit',
                    }}
                  >
                    <option value="all">All devices</option>

                    {devices.map((device) => (
                      <option key={device} value={device}>
                        {device}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  style={{
                    display: 'grid',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span className="eyebrow">BROWSER</span>

                  <select
                    value={browserFilter}
                    onChange={(e) =>
                      setBrowserFilter(e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.25)',
                      color: 'inherit',
                    }}
                  >
                    <option value="all">All browsers</option>

                    {browsers.map((browser) => (
                      <option key={browser} value={browser}>
                        {browser}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  style={{
                    display: 'grid',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span className="eyebrow">OPERATING SYSTEM</span>

                  <select
                    value={osFilter}
                    onChange={(e) =>
                      setOsFilter(e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.25)',
                      color: 'inherit',
                    }}
                  >
                    <option value="all">All operating systems</option>

                    {operatingSystems.map((os) => (
                      <option key={os} value={os}>
                        {os}
                      </option>
                    ))}
                  </select>
                </label>

                {dateFilter === 'custom' && (
                  <>
                    <label
                      style={{
                        display: 'grid',
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <span className="eyebrow">FROM</span>

                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) =>
                          setDateFrom(e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border:
                            '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(0,0,0,0.25)',
                          color: 'inherit',
                        }}
                      />
                    </label>

                    <label
                      style={{
                        display: 'grid',
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <span className="eyebrow">TO</span>

                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) =>
                          setDateTo(e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border:
                            '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(0,0,0,0.25)',
                          color: 'inherit',
                        }}
                      />
                    </label>
                  </>
                )}

                {filterCount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'end',
                    }}
                  >
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={clearFilters}
                    >
                      <X size={14} /> Clear filters
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                marginBottom: 14,
                fontSize: 12,
                opacity: 0.65,
              }}
            >
              Showing {filtered.length} of {visitors.length}{' '}
              tracked visitor
              {visitors.length === 1 ? '' : 's'}
            </div>

            <div className="visitor-directory">
              {filtered.map((visitor) => {
                const detail = details[visitor.visitor_id];
                const isExpanded =
                  expanded === visitor.visitor_id;
                const visitorRevealed = revealed.has(
                  visitor.visitor_id,
                );

                return (
                  <article
                    className="visitor-profile-card"
                    key={visitor.visitor_id}
                  >
                    <div className="visitor-profile-head">
                      <div
                        style={{
                          cursor: 'pointer',
                          minWidth: 0,
                        }}
                        onClick={() =>
                          toggleVisitorDetail(
                            visitor.visitor_id,
                          )
                        }
                      >
                        <span className="eyebrow">
                          {visitor.nickname
                            ? 'CUSTOM NAME'
                            : 'UNNAMED VISITOR'}
                        </span>

                        <h3>
                          {visitor.nickname ||
                            'Unnamed visitor'}
                        </h3>

                        <p>
                          {locationLabel(
                            visitor.country,
                            visitor.region,
                            visitor.city,
                          )}
                        </p>
                      </div>

                      <div className="visitor-card-actions">
                        <button
                          className="admin-secondary"
                          onClick={() =>
                            beginNickname(visitor)
                          }
                        >
                          <Save size={14} /> Rename
                        </button>

                        <button
                          className="admin-secondary"
                          onClick={() =>
                            toggleVisitorDetail(
                              visitor.visitor_id,
                            )
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                          {isExpanded ? 'Close' : 'Details'}
                        </button>
                      </div>
                    </div>

                    <div className="visitor-tech-strip">
                      <span>
                        <Monitor size={13} />{' '}
                        {visitor.device} · {visitor.os} ·{' '}
                        {visitor.browser}
                      </span>

                      <span>
                        <Activity size={13} />{' '}
                        {visitor.pageview_count} views ·{' '}
                        {visitor.interaction_count}{' '}
                        interactions
                      </span>
                    </div>

                    {editing === visitor.visitor_id && (
                      <div className="visitor-nickname-editor">
                        <input
                          autoFocus
                          value={nickname}
                          onChange={(e) =>
                            setNickname(e.target.value)
                          }
                          placeholder="e.g. Restaurant lead, John, Hotel prospect..."
                          maxLength={80}
                        />

                        <button
                          className="admin-primary"
                          disabled={busy}
                          onClick={() =>
                            saveNickname(
                              visitor.visitor_id,
                            )
                          }
                        >
                          <Save size={15} /> Save
                        </button>

                        <button
                          className="admin-secondary"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <div className="visitor-profile-grid">
                      <div>
                        <span>FIRST SEEN</span>
                        <b>
                          {new Date(
                            visitor.first_seen,
                          ).toLocaleString()}
                        </b>
                      </div>

                      <div>
                        <span>LAST SEEN</span>
                        <b>
                          {new Date(
                            visitor.last_seen,
                          ).toLocaleString()}
                        </b>
                      </div>

                      <div>
                        <span>LAST PAGE</span>
                        <b>{visitor.latest_page}</b>
                      </div>

                      <div>
                        <span>LAST EVENT</span>
                        <b>
                          {eventLabel(
                            visitor.latest_event,
                          )}
                        </b>
                      </div>

                      <div>
                        <span>VISITS</span>
                        <b>
                          {visitor.visit_count} visit
                          {visitor.visit_count === 1
                            ? ''
                            : 's'}
                        </b>
                      </div>

                      <div>
                        <span>IP ADDRESS</span>

                        <b>
                          {visitorRevealed
                            ? visitor.ip_full ||
                              visitor.ip_masked ||
                              'Unavailable'
                            : visitor.ip_masked ||
                              'Unavailable'}
                        </b>

                        {visitor.ip_full && (
                          <button
                            type="button"
                            onClick={() =>
                              toggleIp(
                                visitor.visitor_id,
                              )
                            }
                          >
                            {visitorRevealed ? (
                              <>
                                <EyeOff size={12} /> Hide
                              </>
                            ) : (
                              <>
                                <Eye size={12} /> Reveal
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 18,
                          paddingTop: 18,
                          borderTop:
                            '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {loadingDetail ===
                          visitor.visitor_id && (
                          <div className="admin-empty">
                            Loading complete visitor history...
                          </div>
                        )}

                        {detail && (
                          <>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns:
                                  'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: 10,
                                marginBottom: 18,
                              }}
                            >
                              <div className="analytics-card">
                                <div>
                                  <span>SESSIONS</span>
                                  <strong>
                                    {detail.sessions.length}
                                  </strong>
                                </div>
                                <Layers3 size={17} />
                              </div>

                              <div className="analytics-card">
                                <div>
                                  <span>EVENTS</span>
                                  <strong>
                                    {detail.events.length}
                                  </strong>
                                </div>
                                <Activity size={17} />
                              </div>

                              <div className="analytics-card">
                                <div>
                                  <span>PAGE VIEWS</span>
                                  <strong>
                                    {detail.visitor
                                      .pageview_count}
                                  </strong>
                                </div>
                                <Globe2 size={17} />
                              </div>

                              <div className="analytics-card">
                                <div>
                                  <span>INTERACTIONS</span>
                                  <strong>
                                    {detail.visitor
                                      .interaction_count}
                                  </strong>
                                </div>
                                <MousePointerClick
                                  size={17}
                                />
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent:
                                  'space-between',
                                gap: 10,
                                flexWrap: 'wrap',
                                marginBottom: 12,
                              }}
                            >
                              <div>
                                <span className="eyebrow">
                                  SESSION HISTORY
                                </span>

                                <h3
                                  style={{
                                    margin:
                                      '4px 0 0',
                                  }}
                                >
                                  Every visit from this browser
                                </h3>
                              </div>

                              <button
                                type="button"
                                className="admin-secondary"
                                onClick={() =>
                                  refreshVisitor(
                                    visitor.visitor_id,
                                  )
                                }
                                disabled={
                                  loadingDetail ===
                                  visitor.visitor_id
                                }
                              >
                                <RefreshCw size={13} /> Reload
                              </button>
                            </div>

                            {!detail.sessions.length && (
                              <p className="admin-empty">
                                No session records were found.
                              </p>
                            )}

                            <div
                              style={{
                                display: 'grid',
                                gap: 10,
                              }}
                            >
                              {detail.sessions.map(
                                (session, index) => {
                                  const active =
                                    selectedSession ===
                                    session.session_id;

                                  return (
                                    <div
                                      key={
                                        session.session_id
                                      }
                                      style={{
                                        border:
                                          '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        background:
                                          active
                                            ? 'rgba(255,255,255,0.035)'
                                            : 'rgba(255,255,255,0.018)',
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSession(
                                            session.session_id,
                                          )
                                        }
                                        style={{
                                          width: '100%',
                                          display: 'grid',
                                          gridTemplateColumns:
                                            'auto 1fr auto',
                                          alignItems:
                                            'center',
                                          gap: 12,
                                          padding: 14,
                                          border: 0,
                                          background:
                                            'transparent',
                                          color:
                                            'inherit',
                                          textAlign:
                                            'left',
                                          cursor:
                                            'pointer',
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: 34,
                                            height: 34,
                                            display:
                                              'flex',
                                            alignItems:
                                              'center',
                                            justifyContent:
                                              'center',
                                            borderRadius:
                                              9,
                                            border:
                                              '1px solid rgba(255,255,255,0.1)',
                                          }}
                                        >
                                          <Clock3
                                            size={15}
                                          />
                                        </div>

                                        <div
                                          style={{
                                            minWidth: 0,
                                          }}
                                        >
                                          <div
                                            style={{
                                              display:
                                                'flex',
                                              gap: 8,
                                              alignItems:
                                                'center',
                                              flexWrap:
                                                'wrap',
                                            }}
                                          >
                                            <strong>
                                              Visit #
                                              {detail
                                                .sessions
                                                .length -
                                                index}
                                            </strong>

                                            <span
                                              style={{
                                                opacity:
                                                  0.55,
                                                fontSize:
                                                  12,
                                              }}
                                            >
                                              {new Date(
                                                session.started_at,
                                              ).toLocaleString()}
                                            </span>
                                          </div>

                                          <div
                                            style={{
                                              display:
                                                'flex',
                                              gap: 12,
                                              flexWrap:
                                                'wrap',
                                              marginTop:
                                                5,
                                              fontSize:
                                                12,
                                              opacity:
                                                0.68,
                                            }}
                                          >
                                            <span>
                                              <Monitor
                                                size={
                                                  11
                                                }
                                                style={{
                                                  verticalAlign:
                                                    'middle',
                                                }}
                                              />{' '}
                                              {
                                                session.device
                                              }{' '}
                                              ·{' '}
                                              {
                                                session.browser
                                              }
                                            </span>

                                            <span>
                                              <Timer
                                                size={
                                                  11
                                                }
                                                style={{
                                                  verticalAlign:
                                                    'middle',
                                                }}
                                              />{' '}
                                              {formatDuration(
                                                session.duration_seconds,
                                              )}
                                            </span>

                                            <span>
                                              <Activity
                                                size={
                                                  11
                                                }
                                                style={{
                                                  verticalAlign:
                                                    'middle',
                                                }}
                                              />{' '}
                                              {
                                                session.event_count
                                              }{' '}
                                              events
                                            </span>

                                            <span>
                                              <MapPin
                                                size={
                                                  11
                                                }
                                                style={{
                                                  verticalAlign:
                                                    'middle',
                                                }}
                                              />{' '}
                                              {locationLabel(
                                                session.country,
                                                session.region,
                                                session.city,
                                              ) ||
                                                'Unknown'}
                                            </span>
                                          </div>
                                        </div>

                                        {active ? (
                                          <ChevronUp
                                            size={16}
                                          />
                                        ) : (
                                          <ChevronDown
                                            size={16}
                                          />
                                        )}
                                      </button>

                                      {active && (
                                        <div
                                          style={{
                                            padding:
                                              '0 14px 14px',
                                          }}
                                        >
                                          <div
                                            style={{
                                              display:
                                                'grid',
                                              gridTemplateColumns:
                                                'repeat(auto-fit, minmax(160px, 1fr))',
                                              gap: 8,
                                              marginBottom:
                                                12,
                                            }}
                                          >
                                            <div>
                                              <span className="eyebrow">
                                                STARTED
                                              </span>
                                              <div
                                                style={{
                                                  marginTop:
                                                    4,
                                                  fontSize:
                                                    13,
                                                }}
                                              >
                                                {new Date(
                                                  session.started_at,
                                                ).toLocaleString()}
                                              </div>
                                            </div>

                                            <div>
                                              <span className="eyebrow">
                                                LAST ACTIVITY
                                              </span>
                                              <div
                                                style={{
                                                  marginTop:
                                                    4,
                                                  fontSize:
                                                    13,
                                                }}
                                              >
                                                {new Date(
                                                  session.last_seen,
                                                ).toLocaleString()}
                                              </div>
                                            </div>

                                            <div>
                                              <span className="eyebrow">
                                                LOCATION
                                              </span>
                                              <div
                                                style={{
                                                  marginTop:
                                                    4,
                                                  fontSize:
                                                    13,
                                                }}
                                              >
                                                {locationLabel(
                                                  session.country,
                                                  session.region,
                                                  session.city,
                                                ) ||
                                                  'Unknown'}
                                              </div>
                                            </div>

                                            <div>
                                              <span className="eyebrow">
                                                IP
                                              </span>
                                              <div
                                                style={{
                                                  marginTop:
                                                    4,
                                                  fontSize:
                                                    13,
                                                }}
                                              >
                                                {revealed.has(
                                                  visitor.visitor_id,
                                                )
                                                  ? session.ip_full ||
                                                    session.ip_masked ||
                                                    'Unavailable'
                                                  : session.ip_masked ||
                                                    'Unavailable'}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="visitor-timeline">
                                            <div className="timeline-heading">
                                              <span>
                                                SESSION
                                                ACTIVITY
                                              </span>

                                              <span>
                                                {
                                                  session.event_count
                                                }{' '}
                                                event
                                                {session.event_count ===
                                                1
                                                  ? ''
                                                  : 's'}
                                              </span>
                                            </div>

                                            {session.events.map(
                                              (event) => (
                                                <div
                                                  className="timeline-row"
                                                  key={
                                                    event.id
                                                  }
                                                >
                                                  <div className="timeline-icon">
                                                    <Clock3
                                                      size={
                                                        13
                                                      }
                                                    />
                                                  </div>

                                                  <div className="timeline-copy">
                                                    <b>
                                                      {eventLabel(
                                                        event.event,
                                                      )}
                                                    </b>

                                                    <span>
                                                      {
                                                        event.page
                                                      }{' '}
                                                      ·{' '}
                                                      {
                                                        event.device
                                                      }{' '}
                                                      ·{' '}
                                                      {
                                                        event.browser
                                                      }
                                                      {event.referrer
                                                        ? ` · from ${event.referrer}`
                                                        : ''}
                                                    </span>
                                                  </div>

                                                  <time>
                                                    {new Date(
                                                      event.created_at,
                                                    ).toLocaleString()}
                                                  </time>
                                                </div>
                                              ),
                                            )}

                                            {!session.events
                                              .length && (
                                              <p className="admin-empty">
                                                No events were
                                                recorded for
                                                this session.
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                },
                              )}
                            </div>

                            <div
                              style={{
                                marginTop: 22,
                              }}
                            >
                              <span className="eyebrow">
                                COMPLETE EVENT HISTORY
                              </span>

                              <h3
                                style={{
                                  margin:
                                    '4px 0 12px',
                                }}
                              >
                                Everything recorded for this visitor
                              </h3>

                              <div className="visitor-timeline">
                                <div className="timeline-heading">
                                  <span>
                                    ALL SESSIONS
                                  </span>

                                  <span>
                                    {detail.events.length}{' '}
                                    total
                                  </span>
                                </div>

                                {detail.events.map(
                                  (event) => (
                                    <div
                                      className="timeline-row"
                                      key={`all-${event.id}`}
                                    >
                                      <div className="timeline-icon">
                                        <Activity
                                          size={13}
                                        />
                                      </div>

                                      <div className="timeline-copy">
                                        <b>
                                          {eventLabel(
                                            event.event,
                                          )}
                                        </b>

                                        <span>
                                          {event.page}
                                          {' · '}
                                          {event.device}
                                          {' · '}
                                          {event.browser}
                                          {event.os
                                            ? ` · ${event.os}`
                                            : ''}
                                          {event.referrer
                                            ? ` · from ${event.referrer}`
                                            : ''}
                                        </span>
                                      </div>

                                      <time>
                                        {new Date(
                                          event.created_at,
                                        ).toLocaleString()}
                                      </time>
                                    </div>
                                  ),
                                )}

                                {!detail.events.length && (
                                  <p className="admin-empty">
                                    No activity found for
                                    this visitor.
                                  </p>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}

              {!filtered.length && (
                <p className="admin-empty">
                  No visitors match the current search and filters.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .visitor-profile-card {
          transition:
            border-color 160ms ease,
            background 160ms ease;
        }

        .visitor-profile-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }

        @media (max-width: 700px) {
          .visitor-profile-head {
            align-items: flex-start;
          }

          .visitor-card-actions {
            width: 100%;
          }

          .visitor-card-actions button {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}
