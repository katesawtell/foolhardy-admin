import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateForDB(date: Date) {
  // YYYY-MM-DD
  return date.toISOString().slice(0, 10);
}

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

export default function NewEvent() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  const [eventType, setEventType] = useState("market");

  // new: client + status + notes
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [status, setStatus] = useState("inquiry");
  const [notes, setNotes] = useState("");

  const [isRecurring, setIsRecurring] = useState(false);
  const [weeks, setWeeks] = useState(4); // default 4 weeks

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!date) {
        throw new Error("Please pick a date.");
      }

      const baseDate = new Date(date);

      type NewEventRow = {
        title: string;
        date: string;
        location: string;
        type: string;
        client_name: string | null;
        client_email: string | null;
        client_phone: string | null;
        status: string;
        notes: string | null;
      };

      let eventsToInsert: NewEventRow[] = [];

      const cleanedClientName = clientName.trim() || null;
      const cleanedClientEmail = clientEmail.trim() || null;
      const cleanedClientPhone = clientPhone.trim() || null;
      const cleanedNotes = notes.trim() || null;

      if (isRecurring) {
        const totalWeeks = Math.max(1, weeks || 1);

        for (let i = 0; i < totalWeeks; i++) {
          const nextDate = addDays(baseDate, i * 7);
          eventsToInsert.push({
            title,
            date: formatDateForDB(nextDate),
            location,
            type: eventType,
            client_name: cleanedClientName,
            client_email: cleanedClientEmail,
            client_phone: cleanedClientPhone,
            status,
            notes: cleanedNotes,
          });
        }
      } else {
        eventsToInsert.push({
          title,
          date: formatDateForDB(baseDate),
          location,
          type: eventType,
          client_name: cleanedClientName,
          client_email: cleanedClientEmail,
          client_phone: cleanedClientPhone,
          status,
          notes: cleanedNotes,
        });
      }

      const { error } = await supabase.from("events").insert(eventsToInsert);
      if (error) {
        throw error;
      }

      navigate("/events");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Create New Event</h2>

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
            placeholder="Westside Farmers Market"
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
        </label>

        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
            Start date
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
            placeholder="Santa Cruz, CA"
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
        </label>

        {/* Client info */}
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
                placeholder="Client name"
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
                  placeholder="client@email.com"
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                Phone
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(xxx) xxx-xxxx"
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </label>
            </div>
          </div>
        </fieldset>

        {/* Status + recurrence */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            Repeat weekly
          </label>

          {isRecurring && (
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxWidth: "200px" }}>
              Number of weeks
              <input
                type="number"
                min={1}
                max={52}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
              />
            </label>
          )}
        </div>

        {/* Notes */}
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any extra details about this event…"
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", resize: "vertical" }}
          />
        </label>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.6rem 1rem",
            background: "#fbbf24",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            marginTop: "0.5rem",
          }}
        >
          {loading
            ? isRecurring
              ? "Creating recurring events…"
              : "Creating event…"
            : isRecurring
            ? "Create weekly events"
            : "Create event"}
        </button>
      </form>
    </section>
  );
}
