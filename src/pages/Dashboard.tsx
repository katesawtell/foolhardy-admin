import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Event = {
  id: string;
  title: string;
  date: string;
  type: string | null;
  status: string | null;
  location: string | null;
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  reorder_threshold: number;
};

type Goal = {
  id: string;
  title: string;
  month: string; // "YYYY-MM"
  is_done: boolean;
  notes: string | null;
};

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatMonthLabel(monthStr: string) {
  const [yearStr, monthPart] = monthStr.split("-");
  if (!yearStr || !monthPart) return monthStr;

  const yearShort = yearStr.slice(2);
  const monthNum = parseInt(monthPart, 10);
  const monthNames = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const name = monthNames[monthNum] || monthStr;
  return `${name} ${yearShort}`;
}

function isLow(item: InventoryItem) {
  return item.reorder_threshold > 0 && item.quantity <= item.reorder_threshold;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const today = new Date();
        const in30 = new Date();
        in30.setDate(today.getDate() + 30);

        const todayStr = today.toISOString().slice(0, 10);
        const in30Str = in30.toISOString().slice(0, 10);

        const currentMonthStr = today.toISOString().slice(0, 7); // "YYYY-MM"

        const [eventsRes, inventoryRes, goalsRes] = await Promise.all([
          supabase
            .from("events")
            .select("id, title, date, type, status, location")
            .gte("date", todayStr)
            .lte("date", in30Str)
            .order("date", { ascending: true }),
          supabase
            .from("inventory_items")
            .select("id, name, category, quantity, reorder_threshold"),
          supabase
            .from("goals")
            .select("id, title, month, is_done, notes")
            .eq("month", currentMonthStr),
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (inventoryRes.error) throw inventoryRes.error;
        if (goalsRes.error) throw goalsRes.error;

        setEvents((eventsRes.data || []) as Event[]);
        setInventory((inventoryRes.data || []) as InventoryItem[]);
        setGoals((goalsRes.data || []) as Goal[]);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Error loading dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Derived data
  const lowItems = useMemo(
    () => inventory.filter((i) => isLow(i)),
    [inventory]
  );

  const openGoals = useMemo(
    () => goals.filter((g) => !g.is_done),
    [goals]
  );

  const currentMonthLabel = useMemo(() => {
    const anyGoal = goals[0];
    if (anyGoal) return formatMonthLabel(anyGoal.month);
    const today = new Date();
    return formatMonthLabel(today.toISOString().slice(0, 7));
  }, [goals]);

  const eventCounts = useMemo(() => {
    const counts = {
      total: events.length,
      market: 0,
      popup: 0,
      catering: 0,
      booked: 0,
    };

    for (const e of events) {
      if (e.type === "market") counts.market += 1;
      if (e.type === "popup") counts.popup += 1;
      if (e.type === "catering") counts.catering += 1;
      if (e.status === "booked") counts.booked += 1;
    }

    return counts;
  }, [events]);

  return (
    <section>
      <h2>Dashboard</h2>
      <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
        Quick view of upcoming events, inventory, and goals.
      </p>

      {errorMsg && (
        <p style={{ color: "red", marginBottom: "1rem" }}>
          Error loading data: {errorMsg}
        </p>
      )}

      {/* Top KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            padding: "0.9rem 1rem",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            Events (next 30 days)
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
            {eventCounts.total}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
            {eventCounts.booked} booked
          </div>
        </div>

        <div
          style={{
            padding: "0.9rem 1rem",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            Markets / Pop-Ups / Catering
          </div>
          <div style={{ fontSize: "0.9rem", color: "#111827", marginTop: "0.3rem" }}>
            Markets: <strong>{eventCounts.market}</strong>
          </div>
          <div style={{ fontSize: "0.9rem", color: "#111827" }}>
            Pop-Ups: <strong>{eventCounts.popup}</strong>
          </div>
          <div style={{ fontSize: "0.9rem", color: "#111827" }}>
            Catering: <strong>{eventCounts.catering}</strong>
          </div>
        </div>

        <div
          style={{
            padding: "0.9rem 1rem",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            Low inventory items
          </div>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: lowItems.length > 0 ? "#b91c1c" : "#16a34a",
            }}
          >
            {lowItems.length}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
            {lowItems.length > 0
              ? "Restock soon"
              : "You’re stocked ✨"}
          </div>
        </div>

        <div
          style={{
            padding: "0.9rem 1rem",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            Goals for {currentMonthLabel}
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
            {openGoals.length}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
            open goals
          </div>
        </div>
      </div>

      {loading && <p>Loading dashboard…</p>}

      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.5fr)",
            gap: "1.5rem",
          }}
        >
          {/* Left column: Upcoming events + goals */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Upcoming events */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "12px",
                background: "white",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Upcoming events</h3>
                <a
                  href="/events"
                  style={{ fontSize: "0.8rem", color: "#2563eb", textDecoration: "none" }}
                >
                  View all →
                </a>
              </div>

              {events.length === 0 && (
                <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                  No events in the next 30 days.
                </p>
              )}

              {events.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {events.slice(0, 6).map((event) => (
                    <li
                      key={event.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "0.5rem 0",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{event.title}</div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#6b7280",
                            marginTop: "0.1rem",
                          }}
                        >
                          {event.location}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: "0.8rem" }}>
                        <div style={{ color: "#111827" }}>{formatDate(event.date)}</div>
                        <div style={{ marginTop: "0.15rem" }}>
                          {event.type && (
                            <span
                              style={{
                                padding: "0.1rem 0.4rem",
                                borderRadius: "999px",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                fontSize: "0.75rem",
                                marginRight: "0.25rem",
                              }}
                            >
                              {event.type}
                            </span>
                          )}
                          {event.status && (
                            <span
                              style={{
                                padding: "0.1rem 0.4rem",
                                borderRadius: "999px",
                                background:
                                  event.status === "booked" ? "#dcfce7" : "#fef3c7",
                                color:
                                  event.status === "booked" ? "#166534" : "#92400e",
                                fontSize: "0.75rem",
                              }}
                            >
                              {event.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Current month goals */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "12px",
                background: "white",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1rem" }}>
                  Goals for {currentMonthLabel}
                </h3>
                <a
                  href="/goals"
                  style={{ fontSize: "0.8rem", color: "#2563eb", textDecoration: "none" }}
                >
                  Manage goals →
                </a>
              </div>

              {openGoals.length === 0 && (
                <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                  No open goals for this month. You’re caught up ✨
                </p>
              )}

              {openGoals.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {openGoals.slice(0, 5).map((goal) => (
                    <li
                      key={goal.id}
                      style={{
                        padding: "0.4rem 0",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                        {goal.title}
                      </div>
                      {goal.notes && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#6b7280",
                            marginTop: "0.15rem",
                          }}
                        >
                          {goal.notes}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column: Low inventory */}
          <div>
            <div
              style={{
                padding: "1rem",
                borderRadius: "12px",
                background: "white",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Low inventory</h3>
                <a
                  href="/inventory"
                  style={{ fontSize: "0.8rem", color: "#2563eb", textDecoration: "none" }}
                >
                  Open inventory →
                </a>
              </div>

              {lowItems.length === 0 && (
                <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                  Nothing low right now.
                </p>
              )}

              {lowItems.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {lowItems.slice(0, 6).map((item) => (
                    <li
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "0.4rem 0",
                        borderBottom: "1px solid #f3f4f6",
                        fontSize: "0.9rem",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#6b7280",
                            marginTop: "0.1rem",
                          }}
                        >
                          Reorder at {item.reorder_threshold}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div>
                          <span
                            style={{
                              padding: "0.1rem 0.4rem",
                              borderRadius: "999px",
                              background: "#fee2e2",
                              color: "#b91c1c",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            {item.quantity} left
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
