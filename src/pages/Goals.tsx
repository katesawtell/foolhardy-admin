import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Goal = {
  id: string;
  title: string;
  month: string; // "YYYY-MM"
  is_done: boolean;
  notes: string | null;
};

function groupActiveByMonth(goals: Goal[]) {
  const map: Record<string, Goal[]> = {};
  for (const goal of goals) {
    if (!goal.is_done) {
      if (!map[goal.month]) map[goal.month] = [];
      map[goal.month].push(goal);
    }
  }
  // sort months ascending: earliest month at top
  const entries = Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1));
  return entries;
}

function formatMonthLabel(monthStr: string) {
  // expect "YYYY-MM"
  const [yearStr, monthPart] = monthStr.split("-");
  if (!yearStr || !monthPart) return monthStr;

  const yearShort = yearStr.slice(2); // "2025" -> "25"
  const monthNum = parseInt(monthPart, 10);
  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const name = monthNames[monthNum] || monthStr;
  return `${name} ${yearShort}`;
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New goal form
  const [newTitle, setNewTitle] = useState("");
  const [newMonth, setNewMonth] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMonth, setEditMonth] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadGoals() {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("goals")
        .select("id, title, month, is_done, notes, created_at")
        .order("month", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading goals:", error.message);
        setErrorMsg(error.message);
      } else {
        setGoals((data || []) as Goal[]);
      }

      setLoading(false);
    }

    loadGoals();
  }, []);

  const activeByMonth = useMemo(
    () => groupActiveByMonth(goals),
    [goals]
  );

  const completedGoals = useMemo(
    () => goals.filter((g) => g.is_done),
    [goals]
  );

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle || !newMonth) return;

    setSavingNew(true);
    setErrorMsg(null);

    try {
      const monthValue = newMonth; // YYYY-MM
      const cleanedNotes = newNotes.trim() || null;

      const { data, error } = await supabase
        .from("goals")
        .insert([{ title: newTitle, month: monthValue, notes: cleanedNotes }])
        .select("id, title, month, is_done, notes")
        .single();

      if (error) throw error;

      if (data) {
        setGoals((prev) => [...prev, data as Goal]);
      }

      setNewTitle("");
      setNewNotes("");
      // keep month selected to add multiple for same month
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error adding goal");
    } finally {
      setSavingNew(false);
    }
  }

  async function toggleDone(goal: Goal) {
    setTogglingId(goal.id);

    const { error } = await supabase
      .from("goals")
      .update({ is_done: !goal.is_done })
      .eq("id", goal.id);

    if (error) {
      console.error("Error updating goal:", error.message);
      alert("Error updating goal: " + error.message);
    } else {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id ? { ...g, is_done: !goal.is_done } : g
        )
      );
    }

    setTogglingId(null);
  }

  async function deleteGoal(id: string) {
    if (!window.confirm("Delete this goal?")) return;

    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      console.error("Error deleting goal:", error.message);
      alert("Error deleting goal: " + error.message);
    } else {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    }
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditMonth(goal.month);
    setEditNotes(goal.notes || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditMonth("");
    setEditNotes("");
  }

  async function saveEdit(goalId: string) {
    if (!editTitle || !editMonth) return;

    setSavingEdit(true);
    setErrorMsg(null);

    try {
      const cleanedNotes = editNotes.trim() || null;

      const { error } = await supabase
        .from("goals")
        .update({
          title: editTitle,
          month: editMonth,
          notes: cleanedNotes,
        })
        .eq("id", goalId);

      if (error) throw error;

      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? { ...g, title: editTitle, month: editMonth, notes: cleanedNotes }
            : g
        )
      );

      cancelEdit();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error saving changes");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <section>
      <h2>Monthly Goals</h2>
      <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
        Outline what you want to get done each month. Closer months show at the top.
      </p>

      {/* Add Goal Form */}
      <form
        onSubmit={handleAddGoal}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxWidth: "520px",
          padding: "1rem",
          borderRadius: "12px",
          background: "white",
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <label style={{ flex: 2, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            Goal
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="ex: Launch holiday blend, finish cart reseal"
              required
              style={{
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            />
          </label>

          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            Month
            <input
              type="month"
              value={newMonth}
              onChange={(e) => setNewMonth(e.target.value)}
              required
              style={{
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            />
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          Notes (optional)
          <textarea
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            rows={2}
            placeholder="ex: coordinate with roaster, design labels, update website, etc."
            style={{
              padding: "0.5rem",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              resize: "vertical",
            }}
          />
        </label>

        {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

        <button
          type="submit"
          disabled={savingNew}
          style={{
            alignSelf: "flex-start",
            padding: "0.5rem 1rem",
            background: "#fbbf24",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          {savingNew ? "Adding…" : "Add goal"}
        </button>
      </form>

      {loading && <p>Loading goals…</p>}

      {/* Active goals grouped by month */}
      {!loading && activeByMonth.length === 0 && completedGoals.length === 0 && (
        <p>No goals yet. Add something you want to get done ✨</p>
      )}

      {!loading &&
        activeByMonth.map(([month, goalsForMonth]) => (
          <div key={month} style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ marginBottom: "0.5rem" }}>{formatMonthLabel(month)}</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {goalsForMonth.map((goal) => {
                const isEditing = editingId === goal.id;

                return (
                  <li
                    key={goal.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "8px",
                      background: "white",
                      boxShadow: "0 4px 10px rgba(15, 23, 42, 0.04)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {!isEditing && (
                      <>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.5rem",
                            flex: 1,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={goal.is_done}
                            onChange={() => toggleDone(goal)}
                            disabled={togglingId === goal.id}
                            style={{ marginTop: "0.2rem" }}
                          />
                          <div>
                            <div
                              style={{
                                textDecoration: goal.is_done ? "line-through" : "none",
                                color: goal.is_done ? "#9ca3af" : "#111827",
                                fontWeight: 500,
                              }}
                            >
                              {goal.title}
                            </div>
                            {goal.notes && (
                              <div
                                style={{
                                  marginTop: "0.15rem",
                                  fontSize: "0.85rem",
                                  color: "#6b7280",
                                }}
                              >
                                {goal.notes}
                              </div>
                            )}
                          </div>
                        </label>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                            alignItems: "flex-end",
                          }}
                        >
                          <button
                            onClick={() => startEdit(goal)}
                            style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: "6px",
                              border: "1px solid #9ca3af",
                              background: "#f9fafb",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: "6px",
                              border: "1px solid #ef4444",
                              background: "#fff",
                              color: "#b91c1c",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}

                    {isEditing && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                          width: "100%",
                        }}
                      >
                        <div style={{ display: "flex", gap: "0.75rem" }}>
                          <input
                            type="checkbox"
                            checked={goal.is_done}
                            disabled
                            style={{ marginTop: "0.5rem" }}
                          />
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              style={{
                                padding: "0.5rem",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                              }}
                            />
                            <div style={{ display: "flex", gap: "0.75rem" }}>
                              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                Month
                                <input
                                  type="month"
                                  value={editMonth}
                                  onChange={(e) => setEditMonth(e.target.value)}
                                  style={{
                                    padding: "0.5rem",
                                    borderRadius: "6px",
                                    border: "1px solid #d1d5db",
                                  }}
                                />
                              </label>
                            </div>
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              rows={2}
                              style={{
                                padding: "0.5rem",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                resize: "vertical",
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            style={{
                              padding: "0.4rem 0.9rem",
                              borderRadius: "6px",
                              border: "none",
                              background: "#e5e7eb",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(goal.id)}
                            disabled={savingEdit}
                            style={{
                              padding: "0.4rem 0.9rem",
                              borderRadius: "6px",
                              border: "none",
                              background: "#fbbf24",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            {savingEdit ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

      {/* Completed section at the bottom */}
      {!loading && completedGoals.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>Completed</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {completedGoals.map((goal) => (
              <li
                key={goal.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "8px",
                  background: "#f9fafb",
                  marginBottom: "0.5rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    flex: 1,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={goal.is_done}
                    onChange={() => toggleDone(goal)} // unchecking moves it back up
                    disabled={togglingId === goal.id}
                    style={{ marginTop: "0.2rem" }}
                  />
                  <div>
                    <div
                      style={{
                        textDecoration: "line-through",
                        color: "#9ca3af",
                        fontWeight: 500,
                      }}
                    >
                      {goal.title}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                      {formatMonthLabel(goal.month)}
                    </div>
                    {goal.notes && (
                      <div
                        style={{
                          marginTop: "0.15rem",
                          fontSize: "0.85rem",
                          color: "#9ca3af",
                        }}
                      >
                        {goal.notes}
                      </div>
                    )}
                  </div>
                </label>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #ef4444",
                    background: "#fff",
                    color: "#b91c1c",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
