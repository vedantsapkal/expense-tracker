import { useEffect, useState, useCallback } from "react";
import api from "./api";

// ─── UTILITY ────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({ name, size = 36 }) {
  return (
    <div
      className="member-avatar"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── HOUSEHOLD LIST VIEW ─────────────────────────────────────────────────────

function HouseholdList({ currentUser, onSelect }) {
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/households");
      setHouseholds(res.data);
    } catch {
      setError("Failed to load households");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createHousehold(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/households", { name: newName.trim() });
      setHouseholds((prev) => [res.data, ...prev]);
      setNewName("");
      setShowCreate(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create household");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="empty">
        <div className="loader" />
        Loading households...
      </div>
    );
  }

  return (
    <div>
      <div className="hh-list-header">
        <div>
          <p className="eyebrow">HOUSEHOLDS</p>
          <h2 className="hh-title">Your Shared Spaces</h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Create a household with flatmates to track shared expenses.
          </p>
        </div>
        <button className="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "+ New Household"}
        </button>
      </div>

      {error && <div className="error" style={{ marginTop: 14 }}>{error}</div>}

      {showCreate && (
        <form onSubmit={createHousehold} className="hh-create-form card">
          <label>
            Household Name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder='e.g. "Flat 302" or "Office Group"'
              required
            />
          </label>
          <button className="primary" disabled={creating}>
            {creating ? "Creating..." : "Create Household →"}
          </button>
        </form>
      )}

      {households.length === 0 && !showCreate ? (
        <div className="card empty" style={{ marginTop: 20 }}>
          <div>
            <div className="empty-icon">🏠</div>
            <p>No households yet. Create one to start splitting expenses!</p>
          </div>
        </div>
      ) : (
        <div className="hh-grid">
          {households.map((h) => (
            <button key={h._id} className="hh-card" onClick={() => onSelect(h)}>
              <div className="hh-card-top">
                <div className="hh-icon">🏠</div>
                <div>
                  <strong>{h.name}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {h.members.length} member{h.members.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="hh-members-row">
                {h.members.slice(0, 4).map((m) => (
                  <Avatar key={m._id} name={m.name} size={30} />
                ))}
                {h.members.length > 4 && (
                  <span className="hh-more">+{h.members.length - 4}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HOUSEHOLD DETAIL VIEW ───────────────────────────────────────────────────

function HouseholdDetail({ household: initialHousehold, currentUser, onBack, onLeft }) {
  const [household, setHousehold] = useState(initialHousehold);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [totalShared, setTotalShared] = useState(0);
  const [settlements, setSettlements] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Add member
  const [addEmail, setAddEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Settle up
  const [settleForm, setSettleForm] = useState(null); // {creditorId, creditorName, maxAmount}
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [settling, setSettling] = useState(false);

  // Shared expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Show settlements history
  const [showSettlements, setShowSettlements] = useState(false);

  const hid = household._id;

  const load = useCallback(async () => {
    setLoadingData(true);
    try {
      const [expRes, balRes, setRes] = await Promise.all([
        api.get(`/households/${hid}/expenses`),
        api.get(`/households/${hid}/balances`),
        api.get(`/households/${hid}/settlements`),
      ]);
      setExpenses(expRes.data);
      setBalances(balRes.data.balances);
      setTotalShared(balRes.data.totalShared);
      setSettlements(setRes.data);
    } catch {
      setError("Failed to load household data");
    } finally {
      setLoadingData(false);
    }
  }, [hid]);

  useEffect(() => { load(); }, [load]);

  // Auto-clear messages
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  async function addMember(e) {
    e.preventDefault();
    setAddingMember(true);
    setError("");
    try {
      const res = await api.post(`/households/${hid}/members`, { email: addEmail.trim() });
      setHousehold(res.data);
      setAddEmail("");
      setShowAddMember(false);
      setMessage("Member added successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  }

  async function leaveHousehold() {
    if (!window.confirm(`Leave "${household.name}"? You'll lose access to its data.`)) return;
    try {
      await api.delete(`/households/${hid}/members/me`);
      onLeft();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave household");
    }
  }

  async function settleUp(e) {
    e.preventDefault();
    if (!settleForm) return;
    const amt = Number(settleAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid positive amount");
      return;
    }
    setSettling(true);
    setError("");
    try {
      await api.post(`/households/${hid}/settle`, {
        toUser: settleForm.creditorId,
        amount: amt,
        note: settleNote
      });
      setSettleForm(null);
      setSettleAmount("");
      setSettleNote("");
      setMessage(`Settlement of ₹${amt.toFixed(2)} recorded!`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record settlement");
    } finally {
      setSettling(false);
    }
  }

  // Stats derived from expenses + balances
  const myId = currentUser.id;

  const myTotalPaid = expenses.reduce((sum, e) => {
    if (e.paidBy && (e.paidBy._id || e.paidBy) === myId) return sum + e.amount;
    if (e.paidBy && e.paidBy._id?.toString() === myId) return sum + e.amount;
    return sum;
  }, 0);

  const myShare = expenses.reduce((sum, e) => {
    const mySplit = e.splits?.find(
      (s) => s.user && (s.user._id?.toString() === myId || s.user === myId)
    );
    return mySplit ? sum + mySplit.amount : sum;
  }, 0);

  const iOwe = balances
    .filter((b) => b.debtor.id?.toString() === myId || b.debtor._id?.toString() === myId)
    .reduce((sum, b) => sum + b.amount, 0);

  const owedToMe = balances
    .filter((b) => b.creditor.id?.toString() === myId || b.creditor._id?.toString() === myId)
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div>
      {/* Header */}
      <div className="hh-detail-header">
        <button className="cancel-button" onClick={onBack}>← Back</button>
        <div className="hh-detail-title">
          <span className="hh-big-icon">🏠</span>
          <div>
            <h2 style={{ margin: 0 }}>{household.name}</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {household.members.length} member{household.members.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button className="small danger" onClick={leaveHousehold}>
          Leave
        </button>
      </div>

      {error && <div className="error" style={{ margin: "12px 0" }}>{error}</div>}
      {message && <div className="success" style={{ margin: "12px 0" }}>✓ {message}</div>}

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginTop: 16 }}>
        <div className="stat-card purple">
          <div className="stat-icon">₹</div>
          <div>
            <span>Total Shared</span>
            <strong>₹{totalShared.toFixed(2)}</strong>
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">↑</div>
          <div>
            <span>You Paid</span>
            <strong>₹{myTotalPaid.toFixed(2)}</strong>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✓</div>
          <div>
            <span>You Are Owed</span>
            <strong style={{ color: "#059669" }}>₹{owedToMe.toFixed(2)}</strong>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">↓</div>
          <div>
            <span>You Owe</span>
            <strong style={{ color: "#dc2626" }}>₹{iOwe.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <div className="hh-two-col">
        {/* Members panel */}
        <div className="card">
          <div className="card-title">
            <div>
              <span className="section-label">MEMBERS</span>
              <h3 style={{ margin: "4px 0 0" }}>Flatmates</h3>
            </div>
            <button
              className="small edit"
              onClick={() => setShowAddMember(!showAddMember)}
            >
              {showAddMember ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showAddMember && (
            <form onSubmit={addMember} className="hh-add-member-form">
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="their@email.com"
                required
              />
              <button className="primary" disabled={addingMember}>
                {addingMember ? "Adding..." : "Add →"}
              </button>
            </form>
          )}

          <div className="member-list">
            {household.members.map((m) => (
              <div key={m._id} className="member-chip">
                <Avatar name={m.name} size={34} />
                <div>
                  <strong>{m.name}</strong>
                  {m._id.toString() === myId && (
                    <span className="you-badge">You</span>
                  )}
                  <span className="muted" style={{ display: "block", fontSize: 11 }}>
                    {m.email}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Balances panel */}
        <div className="card">
          <div className="card-title">
            <div>
              <span className="section-label">BALANCES</span>
              <h3 style={{ margin: "4px 0 0" }}>Who Owes Whom</h3>
            </div>
          </div>

          {loadingData ? (
            <div className="empty" style={{ minHeight: 100 }}>
              <div className="loader" />
            </div>
          ) : balances.length === 0 ? (
            <div className="empty" style={{ minHeight: 100 }}>
              <div>
                <div className="empty-icon">✅</div>
                <p>All settled up!</p>
              </div>
            </div>
          ) : (
            <div className="balance-list">
              {balances.map((b, i) => {
                const isMyDebt =
                  b.debtor.id?.toString() === myId ||
                  b.debtor._id?.toString() === myId;
                const isMyCredit =
                  b.creditor.id?.toString() === myId ||
                  b.creditor._id?.toString() === myId;

                return (
                  <div key={i} className="balance-row">
                    <div className="balance-info">
                      <Avatar name={b.debtor.name} size={30} />
                      <span className="balance-text">
                        <strong
                          style={{ color: isMyDebt ? "#dc2626" : "inherit" }}
                        >
                          {isMyDebt ? "You" : b.debtor.name}
                        </strong>{" "}
                        owe{isMyDebt ? "" : "s"}{" "}
                        <strong
                          style={{ color: isMyCredit ? "#059669" : "inherit" }}
                        >
                          {isMyCredit ? "you" : b.creditor.name}
                        </strong>
                      </span>
                      <span className="balance-amount">₹{b.amount.toFixed(2)}</span>
                    </div>
                    {isMyDebt && (
                      <button
                        className="settle-btn"
                        onClick={() => {
                          setSettleForm({
                            creditorId: b.creditor.id || b.creditor._id,
                            creditorName: b.creditor.name,
                            maxAmount: b.amount
                          });
                          setSettleAmount(b.amount.toFixed(2));
                          setSettleNote("");
                        }}
                      >
                        Settle Up
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Settle Up Modal */}
      {settleForm && (
        <div className="settle-overlay" onClick={() => setSettleForm(null)}>
          <div className="settle-modal card" onClick={(e) => e.stopPropagation()}>
            <span className="section-label">SETTLEMENT</span>
            <h3 style={{ margin: "6px 0 16px" }}>
              Pay {settleForm.creditorName}
            </h3>
            <form onSubmit={settleUp}>
              <label>
                Amount
                <div className="amount-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0.01"
                    max={settleForm.maxAmount}
                    step="0.01"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    required
                  />
                </div>
              </label>
              <label>
                Note <span className="optional">(optional)</span>
                <input
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Paid via UPI"
                />
              </label>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="primary" disabled={settling}>
                  {settling ? "Recording..." : "Confirm Settlement ✓"}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setSettleForm(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Expenses */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>
          <div>
            <span className="section-label">SHARED EXPENSES</span>
            <h3 style={{ margin: "4px 0 0" }}>Recent Transactions</h3>
          </div>
          <button
            className="primary"
            style={{ fontSize: 13, padding: "9px 14px" }}
            onClick={() => setShowExpenseForm(!showExpenseForm)}
          >
            {showExpenseForm ? "Cancel" : "+ Add Shared Expense"}
          </button>
        </div>

        {showExpenseForm && (
          <SharedExpenseForm
            household={household}
            currentUser={currentUser}
            onSuccess={() => { setShowExpenseForm(false); load(); }}
          />
        )}

        {loadingData ? (
          <div className="empty">
            <div className="loader" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="empty">
            <div>
              <div className="empty-icon">🧾</div>
              <p>No shared expenses yet. Add your first one!</p>
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Paid By</th>
                  <th>Split</th>
                  <th>Date</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp._id}>
                    <td>
                      <span className="category-badge">{exp.category}</span>
                    </td>
                    <td>
                      <strong className="amount">₹{Number(exp.amount).toFixed(2)}</strong>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar name={exp.paidBy?.name} size={24} />
                        <span>{exp.paidBy?.name || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="split-pills">
                        {exp.splits?.map((s) => (
                          <span key={s._id} className="split-pill">
                            {s.user?.name || "?"}: ₹{Number(s.amount).toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{formatDate(exp.createdAt)}</td>
                    <td className="comments">{exp.comments || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settlement History */}
      {settlements.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-title">
            <div>
              <span className="section-label">HISTORY</span>
              <h3 style={{ margin: "4px 0 0" }}>Settlements</h3>
            </div>
            <button
              className="small edit"
              onClick={() => setShowSettlements(!showSettlements)}
            >
              {showSettlements ? "Hide" : "Show"}
            </button>
          </div>

          {showSettlements && (
            <div className="balance-list" style={{ marginTop: 12 }}>
              {settlements.map((s) => (
                <div key={s._id} className="balance-row">
                  <div className="balance-info">
                    <Avatar name={s.fromUser?.name} size={28} />
                    <span className="balance-text">
                      <strong>{s.fromUser?.name}</strong> paid{" "}
                      <strong>{s.toUser?.name}</strong>
                    </span>
                    <span className="balance-amount">₹{Number(s.amount).toFixed(2)}</span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {formatDate(s.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SHARED EXPENSE FORM (within a household) ────────────────────────────────

function SharedExpenseForm({ household, currentUser, onSuccess }) {
  const members = household.members;

  const [form, setForm] = useState({
    category: "",
    amount: "",
    comments: "",
    paymentMethod: "",
    paidBy: currentUser.id,
    splitType: "equal",
    splitBetween: members.map((m) => m._id.toString()), // default: everyone
    customSplits: Object.fromEntries(members.map((m) => [m._id.toString(), ""])),
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggle(memberId) {
    setForm((prev) => {
      const sb = prev.splitBetween.includes(memberId)
        ? prev.splitBetween.filter((id) => id !== memberId)
        : [...prev.splitBetween, memberId];
      return { ...prev, splitBetween: sb };
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const numAmount = Number(form.amount);
    if (!form.category.trim() || !Number.isFinite(numAmount) || numAmount <= 0) {
      setError("Category and a positive amount are required");
      return;
    }

    let splits;
    if (form.splitType === "equal") {
      splits = form.splitBetween;
    } else {
      splits = form.splitBetween.map((uid) => ({
        user: uid,
        amount: Number(form.customSplits[uid] || 0),
      }));
    }

    setSubmitting(true);
    try {
      await api.post("/expenses", {
        category: form.category,
        amount: numAmount,
        comments: form.comments,
        paymentMethod: form.paymentMethod || undefined,
        isShared: true,
        household: household._id,
        paidBy: form.paidBy,
        splits,
        splitType: form.splitType,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shared-expense-form">
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      <form onSubmit={submit} className="expense-form">
        <div className="hh-form-grid">
          <label>
            Category
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Groceries, Rent, Dinner…"
              required
            />
          </label>
          <label>
            Amount
            <div className="amount-input">
              <span>₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
          </label>
          <label>
            Payment Method <span className="optional">(optional)</span>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              <option value="">Not specified</option>
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank Transfer</option>
            </select>
          </label>
          <label>
            Paid By
            <select
              value={form.paidBy}
              onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
            >
              {members.map((m) => (
                <option key={m._id} value={m._id.toString()}>
                  {m.name}{m._id.toString() === currentUser.id ? " (You)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ marginTop: 4 }}>
          Comments <span className="optional">(optional)</span>
          <textarea
            value={form.comments}
            onChange={(e) => setForm({ ...form, comments: e.target.value })}
            placeholder="What was this for?"
            rows={2}
          />
        </label>

        <div className="split-section">
          <div className="split-type-row">
            <strong>Split Type</strong>
            <div className="toggle-group">
              <button
                type="button"
                className={form.splitType === "equal" ? "toggle-active" : "toggle-btn"}
                onClick={() => setForm({ ...form, splitType: "equal" })}
              >
                Equal
              </button>
              <button
                type="button"
                className={form.splitType === "custom" ? "toggle-active" : "toggle-btn"}
                onClick={() => setForm({ ...form, splitType: "custom" })}
              >
                Custom
              </button>
            </div>
          </div>

          <div className="split-member-list">
            <p className="section-label" style={{ marginBottom: 8 }}>
              {form.splitType === "equal"
                ? "SPLIT BETWEEN (equal share)"
                : "CUSTOM AMOUNTS"}
            </p>
            {members.map((m) => {
              const uid = m._id.toString();
              const isSelected = form.splitBetween.includes(uid);
              const isMe = uid === currentUser.id;
              const equalShare =
                form.splitBetween.length > 0 && form.splitType === "equal"
                  ? (Number(form.amount) / form.splitBetween.length).toFixed(2)
                  : null;

              return (
                <div key={uid} className={`split-member-row ${isSelected ? "selected" : ""}`}>
                  <label className="split-member-check">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(uid)}
                    />
                    <Avatar name={m.name} size={28} />
                    <span>
                      {m.name}
                      {isMe && <span className="you-badge">You</span>}
                    </span>
                  </label>
                  {isSelected && form.splitType === "equal" && equalShare && (
                    <span className="split-equal-amount">₹{equalShare}</span>
                  )}
                  {isSelected && form.splitType === "custom" && (
                    <div className="amount-input" style={{ width: 130 }}>
                      <span>₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.customSplits[uid]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            customSplits: { ...form.customSplits, [uid]: e.target.value },
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button className="primary submit-button" disabled={submitting}>
          {submitting ? "Adding…" : "Add Shared Expense +"}
        </button>
      </form>
    </div>
  );
}

// ─── PAGE ROOT ───────────────────────────────────────────────────────────────

export default function HouseholdPage({ currentUser }) {
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [key, setKey] = useState(0); // force re-mount list after leave

  function handleLeft() {
    setSelectedHousehold(null);
    setKey((k) => k + 1);
  }

  return (
    <div className="app-shell">
      <main className="container" style={{ paddingTop: 36 }}>
        {selectedHousehold ? (
          <HouseholdDetail
            household={selectedHousehold}
            currentUser={currentUser}
            onBack={() => setSelectedHousehold(null)}
            onLeft={handleLeft}
          />
        ) : (
          <HouseholdList
            key={key}
            currentUser={currentUser}
            onSelect={setSelectedHousehold}
          />
        )}
      </main>
    </div>
  );
}
