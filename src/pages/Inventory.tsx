import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorder_threshold: number;
  notes: string | null;
};

const CATEGORIES = [
  { value: "beans", label: "Beans" },
  { value: "milk", label: "Milk" },
  { value: "syrup", label: "Syrups" },
  { value: "cups", label: "Cups & Lids" },
  { value: "other", label: "Other" },
];

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // filters
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [showLowOnly, setShowLowOnly] = useState(false);

  // new item form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("beans");
  const [newUnit, setNewUnit] = useState("");
  const [newQuantity, setNewQuantity] = useState<number | string>("");
  const [newThreshold, setNewThreshold] = useState<number | string>("");
  const [newNotes, setNewNotes] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  // editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("beans");
  const [editUnit, setEditUnit] = useState("");
  const [editQuantity, setEditQuantity] = useState<number | string>("");
  const [editThreshold, setEditThreshold] = useState<number | string>("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // quick quantity adjustments
  const [updatingQtyId, setUpdatingQtyId] = useState<string | null>(null);

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, category, unit, quantity, reorder_threshold, notes")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading inventory:", error.message);
        setErrorMsg(error.message);
      } else {
        setItems((data || []) as InventoryItem[]);
      }

      setLoading(false);
    }

    loadItems();
  }, []);

  function isLow(item: InventoryItem) {
    return item.reorder_threshold > 0 && item.quantity <= item.reorder_threshold;
  }

  const lowCount = useMemo(
    () =>
      items.filter(
        (item) => item.reorder_threshold > 0 && item.quantity <= item.reorder_threshold
      ).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (showLowOnly && !isLow(item)) return false;
      return true;
    });
  }, [items, categoryFilter, showLowOnly]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newUnit) return;

    setSavingNew(true);
    setErrorMsg(null);

    try {
      const quantityValue = newQuantity === "" ? 0 : Number(newQuantity);
      const thresholdValue = newThreshold === "" ? 0 : Number(newThreshold);

      const { data, error } = await supabase
        .from("inventory_items")
        .insert([
          {
            name: newName,
            category: newCategory,
            unit: newUnit,
            quantity: quantityValue,
            reorder_threshold: thresholdValue,
            notes: newNotes.trim() || null,
          },
        ])
        .select("id, name, category, unit, quantity, reorder_threshold, notes")
        .single();

      if (error) throw error;

      if (data) {
        setItems((prev) => [...prev, data as InventoryItem]);
      }

      setNewName("");
      setNewUnit("");
      setNewQuantity("");
      setNewThreshold("");
      setNewNotes("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error adding item");
    } finally {
      setSavingNew(false);
    }
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditQuantity(item.quantity);
    setEditThreshold(item.reorder_threshold);
    setEditNotes(item.notes || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditUnit("");
    setEditQuantity("");
    setEditThreshold("");
    setEditNotes("");
  }

  async function saveEdit(itemId: string) {
    if (!editName || !editUnit) return;

    setSavingEdit(true);
    setErrorMsg(null);

    try {
      const quantityValue = editQuantity === "" ? 0 : Number(editQuantity);
      const thresholdValue = editThreshold === "" ? 0 : Number(editThreshold);

      const { error } = await supabase
        .from("inventory_items")
        .update({
          name: editName,
          category: editCategory,
          unit: editUnit,
          quantity: quantityValue,
          reorder_threshold: thresholdValue,
          notes: editNotes.trim() || null,
        })
        .eq("id", itemId);

      if (error) throw error;

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                name: editName,
                category: editCategory,
                unit: editUnit,
                quantity: quantityValue,
                reorder_threshold: thresholdValue,
                notes: editNotes.trim() || null,
              }
            : item
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

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this item from inventory?")) return;

    setDeletingId(id);

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting item:", error.message);
      alert("Error deleting item: " + error.message);
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }

    setDeletingId(null);
  }

  async function adjustQuantity(item: InventoryItem, delta: number) {
    const newQty = Math.max(0, item.quantity + delta);
    setUpdatingQtyId(item.id);

    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({ quantity: newQty })
        .eq("id", item.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, quantity: newQty } : i
        )
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error updating quantity");
    } finally {
      setUpdatingQtyId(null);
    }
  }

  return (
    <section>
      <h2>Inventory</h2>
      <p style={{ color: "#6b7280", marginBottom: "0.75rem" }}>
        Track beans, milk, syrups, cups, and more.{" "}
        {lowCount > 0 && (
          <strong style={{ color: "#b91c1c" }}>
            {lowCount} item{lowCount !== 1 ? "s" : ""} low.
          </strong>
        )}
      </p>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as "all" | string)
            }
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              border: "1px solid #d1d5db",
              fontSize: "0.9rem",
            }}
          >
            <option value="all">All</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.9rem",
            color: "#6b7280",
          }}
        >
          <input
            type="checkbox"
            checked={showLowOnly}
            onChange={(e) => setShowLowOnly(e.target.checked)}
          />
          Show low only
        </label>
      </div>

      {/* Add item form */}
      <form
        onSubmit={handleAddItem}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxWidth: "620px",
          padding: "1rem",
          borderRadius: "12px",
          background: "white",
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <label style={{ flex: 2, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            Name
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex: Westside Blend 5lb bag"
              required
              style={{
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            />
          </label>

          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            Category
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            Unit
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="lb, gallon, sleeve…"
              required
              style={{
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            Quantity
            <input
              type="number"
              min={0}
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="0"
              style={{
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            />
          </label>

          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            Reorder at
            <input
              type="number"
              min={0}
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
              placeholder="ex: 1"
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
            placeholder="ex: use for markets only."
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
          {savingNew ? "Adding…" : "Add item"}
        </button>
      </form>

      {/* List */}
      {loading && <p>Loading inventory…</p>}

      {!loading && filteredItems.length === 0 && items.length > 0 && (
        <p>No items match those filters.</p>
      )}

      {!loading && items.length === 0 && (
        <p>No inventory yet. Add your first item above 🌱</p>
      )}

      {!loading && filteredItems.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th style={{ width: "160px" }}>Qty</th>
              <th>Unit</th>
              <th>Reorder at</th>
              <th>Notes</th>
              <th style={{ width: "160px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const editing = editingId === item.id;
              const low = isLow(item);

              if (!editing) {
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      {CATEGORIES.find((c) => c.value === item.category)?.label ??
                        item.category}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => adjustQuantity(item, -1)}
                          disabled={updatingQtyId === item.id || item.quantity <= 0}
                          style={{
                            padding: "0.1rem 0.4rem",
                            borderRadius: "999px",
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          −
                        </button>
                        <span>
                          {item.quantity}
                          {low && (
                            <span
                              style={{
                                marginLeft: "0.5rem",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "999px",
                                background: "#fee2e2",
                                color: "#b91c1c",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              Low
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustQuantity(item, 1)}
                          disabled={updatingQtyId === item.id}
                          style={{
                            padding: "0.1rem 0.4rem",
                            borderRadius: "999px",
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>{item.unit}</td>
                    <td>{item.reorder_threshold}</td>
                    <td style={{ maxWidth: "260px" }}>
                      <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                        {item.notes}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => startEdit(item)}
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
                          onClick={() => deleteItem(item.id)}
                          disabled={deletingId === item.id}
                          style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: "6px",
                            border: "1px solid #ef4444",
                            background:
                              deletingId === item.id ? "#fee2e2" : "#ffffff",
                            color: "#b91c1c",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          {deletingId === item.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              // editing row
              return (
                <tr key={item.id}>
                  <td colSpan={7}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <label
                          style={{
                            flex: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          Name
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{
                              padding: "0.5rem",
                              borderRadius: "6px",
                              border: "1px solid #d1d5db",
                            }}
                          />
                        </label>

                        <label
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          Category
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            style={{
                              padding: "0.5rem",
                              borderRadius: "6px",
                              border: "1px solid #d1d5db",
                            }}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          Unit
                          <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            style={{
                              padding: "0.5rem",
                              borderRadius: "6px",
                              border: "1px solid #d1d5db",
                            }}
                          />
                        </label>
                      </div>

                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <label
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          Quantity
                          <input
                            type="number"
                            min={0}
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            style={{
                              padding: "0.5rem",
                              borderRadius: "6px",
                              border: "1px solid #d1d5db",
                            }}
                          />
                        </label>
                        <label
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          Reorder at
                          <input
                            type="number"
                            min={0}
                            value={editThreshold}
                            onChange={(e) => setEditThreshold(e.target.value)}
                            style={{
                              padding: "0.5rem",
                              borderRadius: "6px",
                              border: "1px solid #d1d5db",
                            }}
                          />
                        </label>
                      </div>

                      <label
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                        }}
                      >
                        Notes
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
                      </label>

                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          justifyContent: "flex-end",
                        }}
                      >
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
                          onClick={() => saveEdit(item.id)}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
