import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const EVENT_TYPES = [
  { value: "market", label: "Farmers Market" },
  { value: "wedding", label: "Wedding" },
  { value: "corporate", label: "Corporate" },
  { value: "private", label: "Private Event" },
  { value: "popup", label: "Pop-up" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "inquiry", label: "Inquiry" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "booked", label: "Booked" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("market");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [status, setStatus] = useState("inquiry");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      if (!id) {
        setError("Missing event ID");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select(
          "id, title, date, location, type, client_name, client_email, client_phone, status, notes"
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error loading event:", error.message);
        setError(error.message);
      } else if (data) {
        setTitle(data.title || "");
        setDate(data.date || "");
        setLocation(data.location || "");
        setEventType(data.type || "market");

        setClientName(data.client_name || "");
        setClientEmail(data.client_email || "");
        setClientPhone(data.client_phone || "");
        setStatus(data.status || "inquiry");
        setNotes(data.notes || "");
      }

      setLoading(false);
    }

    loadEvent();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("events")
      .update({
        title,
        date,
        location,
        type: eventType,
        client_name: clientName.trim() || null,
        client_email: clientEmail.trim() || null,
        client_phone: clientPhone.trim() || null,
        status,
        notes: notes.trim() || null,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      console.error("Error updating event:", error.message);
      setError(error.message);
    } else {
      navigate("/events");
    }
  }

  if (loading) {
    return <p>Loading event…</p>;
  }

  if (error) {
    return (
      <section>
        <h2>Edit Event</h2>
        <p style={{ color: "red" }}>Error: {error}</p>
        <button onClick={() => navigate("/events")}>Back to events</button>
      </section>
    );
  }

  return (
    <section>
      <h2>Edit Event</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: "520px",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
        </label>

        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
            Type
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          Location
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
        </label>

        <fieldset
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
          }}
        >
          <legend style={{ padding: "0 0.5rem", fontSize: "0.9rem", color: "#6b7280" }}>
            Client (optional)
          </legend>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              Name
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
              />
            </label>

            <div style={{ display: "flex", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                Email
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                Phone
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </label>
            </div>
          </div>
        </fieldset>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxWidth: "220px" }}>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", resize: "vertical" }}
          />
        </label>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.6rem 1rem",
              background: "#fbbf24",
              borderRadius: "8px",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/events")}
            style={{
              padding: "0.6rem 1rem",
              background: "#e5e7eb",
              borderRadius: "8px",
              border: "none",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
