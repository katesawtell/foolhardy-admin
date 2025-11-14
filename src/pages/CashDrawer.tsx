import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type CashSession = {
  id: string;
  date: string;
  opening_total: number;
  closing_total: number;
  stall_fee: number;
  payouts: number;
  notes: string | null;
};

type Denom = {
  label: string;
  value: number;
};

const DENOMS: Denom[] = [
  { label: "$100", value: 100 },
  { label: "$50", value: 50 },
  { label: "$20", value: 20 },
  { label: "$10", value: 10 },
  { label: "$5", value: 5 },
  { label: "$1", value: 1 },
];

function computeTotal(counts: Record<string, string>): number {
  return DENOMS.reduce((sum, d) => {
    const raw = counts[d.value.toString()] || "0";
    const num = Number(raw);
    if (Number.isNaN(num)) return sum;
    return sum + num * d.value;
  }, 0);
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export default function CashDrawer() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(todayStr);

  // denomination counts
  const [openingCounts, setOpeningCounts] = useState<Record<string, string>>({});
  const [closingCounts, setClosingCounts] = useState<Record<string, string>>({});

  const openingTotal = useMemo(
    () => computeTotal(openingCounts),
    [openingCounts]
  );
  const closingTotal = useMemo(
    () => computeTotal(closingCounts),
    [closingCounts]
  );

  const [stallFee, setStallFee] = useState<string>("");
  const [payouts, setPayouts] = useState<string>("");
  const [notes, setNotes] = useState("");

  const stallFeeNum = Number(stallFee || 0);
  const payoutsNum = Number(payouts || 0);

  const netCash = closingTotal - openingTotal - stallFeeNum - payoutsNum;

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      setLoadingSessions(true);
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("id, date, opening_total, closing_total, stall_fee, payouts, notes")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading cash sessions:", error.message);
        setErrorMsg(error.message);
      } else {
        setSessions((data || []) as CashSession[]);
      }

      setLoadingSessions(false);
    }

    loadSessions();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const { error, data } = await supabase
        .from("cash_sessions")
        .insert([
          {
            date,
            opening_total: openingTotal,
            closing_total: closingTotal,
            stall_fee: stallFeeNum || 0,
            payouts: payoutsNum || 0,
            notes: notes.trim() || null,
          },
        ])
        .select(
          "id, date, opening_total, closing_total, stall_fee, payouts, notes"
        )
        .single();

      if (error) throw error;

      if (data) {
        setSessions((prev) => [data as CashSession, ...prev]);
      }

      // optional: reset notes + fees/payouts; keep counts if you want
      setNotes("");
      setStallFee("");
      setPayouts("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error saving cash session");
    } finally {
      setSaving(false);
    }
  }

  function handleCountChange(
    which: "opening" | "closing",
    denomValue: number,
    value: string
  ) {
    const key = denomValue.toString();
    if (which === "opening") {
      setOpeningCounts((prev) => ({ ...prev, [key]: value }));
    } else {
      setClosingCounts((prev) => ({ ...prev, [key]: value }));
    }
  }

  return (
    <section>
      <h2>Cash Drawer</h2>
      <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
        Count the drawer before/after markets and track stall fee + payouts.
      </p>

      <form
        onSubmit={handleSave}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          padding: "1rem",
          borderRadius: "12px",
          background: "white",
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
          marginBottom: "1.5rem",
          maxWidth: "850px",
        }}
      >
        {/* Date */}
        <label
          style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
        >
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              maxWidth: "220px",
            }}
          />
        </label>

        {/* Denomination tables */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Opening */}
          <div>
            <h3 style={{ margin: "0 0 0.5rem" }}>Starting drawer</h3>
            <table style={{ width: "100%", fontSize: "0.9rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Denom</th>
                  <th style={{ textAlign: "left" }}>Count</th>
                  <th style={{ textAlign: "right" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {DENOMS.map((d) => {
                  const key = d.value.toString();
                  const count = Number(openingCounts[key] || 0);
                  const subtotal = count * d.value;

                  return (
                    <tr key={d.value}>
                      <td>{d.label}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={openingCounts[key] ?? ""}
                          onChange={(e) =>
                            handleCountChange("opening", d.value, e.target.value)
                          }
                          style={{
                            width: "70px",
                            padding: "0.25rem",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {subtotal > 0 ? formatCurrency(subtotal) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ fontWeight: 600 }}>
                    Total starting
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {formatCurrency(openingTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Closing */}
          <div>
            <h3 style={{ margin: "0 0 0.5rem" }}>Ending drawer</h3>
            <table style={{ width: "100%", fontSize: "0.9rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Denom</th>
                  <th style={{ textAlign: "left" }}>Count</th>
                  <th style={{ textAlign: "right" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {DENOMS.map((d) => {
                  const key = d.value.toString();
                  const count = Number(closingCounts[key] || 0);
                  const subtotal = count * d.value;

                  return (
                    <tr key={d.value}>
                      <td>{d.label}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={closingCounts[key] ?? ""}
                          onChange={(e) =>
                            handleCountChange("closing", d.value, e.target.value)
                          }
                          style={{
                            width: "70px",
                            padding: "0.25rem",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {subtotal > 0 ? formatCurrency(subtotal) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ fontWeight: 600 }}>
                    Total ending
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {formatCurrency(closingTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Fees / payouts / summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
            gap: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                maxWidth: "220px",
              }}
            >
              Stall fee
              <input
                type="number"
                min={0}
                step="0.01"
                value={stallFee}
                onChange={(e) => setStallFee(e.target.value)}
                placeholder="0.00"
                style={{
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                maxWidth: "220px",
              }}
            >
              Payouts to helpers
              <input
                type="number"
                min={0}
                step="0.01"
                value={payouts}
                onChange={(e) => setPayouts(e.target.value)}
                placeholder="0.00"
                style={{
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              />
            </label>

            <label
              style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
            >
              Notes (optional)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="ex: Westside market, slow morning, busy 11-1, tipped out Steven $60 in cash."
                style={{
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  resize: "vertical",
                }}
              />
            </label>
          </div>

          <div
            style={{
              borderRadius: "10px",
              background: "#f9fafb",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Summary</h4>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.15rem",
              }}
            >
              <span>Starting cash</span>
              <span>{formatCurrency(openingTotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.15rem",
              }}
            >
              <span>Ending cash</span>
              <span>{formatCurrency(closingTotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.15rem",
              }}
            >
              <span>Stall fee</span>
              <span>- {formatCurrency(stallFeeNum || 0)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.4rem",
              }}
            >
              <span>Payouts</span>
              <span>- {formatCurrency(payoutsNum || 0)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 600,
              }}
            >
              <span>Net cash for day</span>
              <span
                style={{
                  color: netCash >= 0 ? "#166534" : "#b91c1c",
                }}
              >
                {formatCurrency(netCash)}
              </span>
            </div>
          </div>
        </div>

        {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{
            alignSelf: "flex-start",
            padding: "0.6rem 1.2rem",
            background: "#fbbf24",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          {saving ? "Saving…" : "Save session"}
        </button>
      </form>

      {/* Recent sessions */}
      <div
        style={{
          padding: "1rem",
          borderRadius: "12px",
          background: "white",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
          maxWidth: "850px",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>
          Recent cash sessions
        </h3>

        {loadingSessions && <p>Loading sessions…</p>}

        {!loadingSessions && sessions.length === 0 && (
          <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
            Nothing saved yet. After a market, count your drawer and save it here.
          </p>
        )}

        {!loadingSessions && sessions.length > 0 && (
          <table style={{ width: "100%", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Opening</th>
                <th>Closing</th>
                <th>Stall fee</th>
                <th>Payouts</th>
                <th>Net</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const net =
                  s.closing_total -
                  s.opening_total -
                  s.stall_fee -
                  s.payouts;

                return (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td>{formatCurrency(s.opening_total)}</td>
                    <td>{formatCurrency(s.closing_total)}</td>
                    <td>{formatCurrency(s.stall_fee)}</td>
                    <td>{formatCurrency(s.payouts)}</td>
                    <td
                      style={{
                        color: net >= 0 ? "#166534" : "#b91c1c",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(net)}
                    </td>
                    <td style={{ maxWidth: "260px" }}>
                      <span style={{ color: "#6b7280" }}>{s.notes}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
