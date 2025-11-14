import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

type Event = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  type: string | null;
  client_name: string | null;
  status: string | null;
};

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const navigate = useNavigate();

  async function loadEvents() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("events")
      .select("id, title, date, location, type, client_name, status")
      .order("date", { ascending: true });

    if (error) {
      console.error("Error loading events:", error.message);
      setErrorMsg(error.message);
    } else {
      setEvents(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this event?")) return;

    setDeletingId(id);

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error("Error deleting event:", error.message);
      alert("Error deleting event: " + error.message);
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }

    setDeletingId(null);
  }

  if (loading) return <p>Loading events…</p>;

  return (
    <section>
      <h2>Events</h2>

      <button
        onClick={() => navigate("/events/new")}
        style={{
          padding: "0.5rem 1rem",
          background: "#fbbf24",
          borderRadius: "8px",
          border: "none",
          fontWeight: "600",
          cursor: "pointer",
          marginBottom: "1rem",
        }}
      >
        + New Event
      </button>

      {errorMsg && <p style={{ color: "red" }}>Error loading events: {errorMsg}</p>}

      {!errorMsg && events.length === 0 && <p>No events yet.</p>}

      {!errorMsg && events.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Date</th>
              <th>Client</th>
              <th>Status</th>
              <th>Location</th>
              <th style={{ width: "160px" }}></th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.title}</td>
                <td>{event.type || "—"}</td>
                <td>{event.date}</td>
                <td>{event.client_name || "—"}</td>
                <td>{event.status || "—"}</td>
                <td>{event.location}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => navigate(`/events/${event.id}/edit`)}
                      style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "6px",
                        border: "1px solid #9ca3af",
                        background: "#f9fafb",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      disabled={deletingId === event.id}
                      style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "6px",
                        border: "1px solid #ef4444",
                        background: deletingId === event.id ? "#fee2e2" : "#ffffff",
                        color: "#b91c1c",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      {deletingId === event.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
