import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import api, { setAuthToken } from "./api";
import HouseholdPage from "./Household";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer"];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState(getStoredUser());

  function login(token, userData) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setAuthToken(token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthToken(null);
    setUser(null);
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthPage mode="login" onAuth={login} />
          )
        }
      />

      <Route
        path="/signup"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthPage mode="signup" onAuth={login} />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          user ? (
            <Dashboard user={user} onLogout={logout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/household"
        element={
          user ? (
            <HouseholdWrapper user={user} onLogout={logout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={user ? "/dashboard" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

// Household page wrapped with the shared topbar
function HouseholdWrapper({ user, onLogout }) {
  return (
    <>
      <Topbar user={user} onLogout={onLogout} />
      <HouseholdPage currentUser={user} />
      <footer className="footer">
        <span>ExpenseFlow</span>
        <span>Personal Expense Management System</span>
      </footer>
    </>
  );
}

// ─── SHARED TOPBAR ───────────────────────────────────────────────────────────

function Topbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="topbar">
      <div className="brand-area">
        <div className="logo-icon small-logo">₹</div>
        <div>
          <div className="brand">ExpenseFlow</div>
          <span className="welcome">Personal Finance Dashboard</span>
        </div>
      </div>

      <nav className="topbar-nav">
        <button
          className={`nav-link ${location.pathname === "/dashboard" ? "nav-link-active" : ""}`}
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`nav-link ${location.pathname === "/household" ? "nav-link-active" : ""}`}
          onClick={() => navigate("/household")}
        >
          🏠 Household
        </button>
      </nav>

      <div className="user-area">
        <div className="user-avatar">
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

// ─── AUTH PAGE ───────────────────────────────────────────────────────────────

function AuthPage({ mode, onAuth }) {
  const navigate = useNavigate();
  const isSignup = mode === "signup";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isSignup ? "/auth/signup" : "/auth/login";

      const body = isSignup
        ? form
        : { email: form.email, password: form.password };

      const response = await api.post(endpoint, body);

      onAuth(response.data.token, response.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-decoration decoration-one"></div>
      <div className="auth-decoration decoration-two"></div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">₹</div>
          <span>ExpenseFlow</span>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">PERSONAL FINANCE</p>

          <h1>
            {isSignup ? "Create your account" : "Welcome back!"}
          </h1>

          <p className="muted">
            {isSignup
              ? "Start managing your expenses smarter."
              : "Manage your money with ease."}
          </p>
        </div>

        <form onSubmit={submit}>
          {isSignup && (
            <label>
              Full Name
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Enter your name"
                required
              />
            </label>
          )}

          <label>
            Email Address
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button
            className="primary full auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isSignup
              ? "Create Account →"
              : "Login →"}
          </button>
        </form>

        <p className="switch">
          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}{" "}

          <button
            className="link-button"
            onClick={() =>
              navigate(isSignup ? "/login" : "/signup")
            }
          >
            {isSignup ? "Login" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

function Dashboard({ user, onLogout }) {
  const [expenses, setExpenses] = useState([]);

  const [form, setForm] = useState({
    category: "",
    amount: "",
    comments: "",
    paymentMethod: "",
    isShared: false,
    household: "",
    paidBy: user.id,
    splitType: "equal",
    splitBetween: [],
    customSplits: {},
  });

  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPayment, setFilterPayment] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // Household data for shared expense
  const [households, setHouseholds] = useState([]);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const navigate = useNavigate();

  async function loadExpenses() {
    try {
      const response = await api.get("/expenses");
      setExpenses(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load expenses"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadHouseholds() {
    try {
      const res = await api.get("/households");
      setHouseholds(res.data);
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    loadExpenses();
    loadHouseholds();
  }, []);

  // When household changes in form, update members list
  useEffect(() => {
    if (form.household) {
      const h = households.find((h) => h._id === form.household);
      if (h) {
        setHouseholdMembers(h.members);
        setForm((prev) => ({
          ...prev,
          paidBy: user.id,
          splitBetween: h.members.map((m) => m._id.toString()),
          customSplits: Object.fromEntries(
            h.members.map((m) => [m._id.toString(), ""])
          ),
        }));
      }
    }
  }, [form.household, households, user.id]);

  // Auto-dismiss message
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  function resetForm() {
    setForm({
      category: "",
      amount: "",
      comments: "",
      paymentMethod: "",
      isShared: false,
      household: "",
      paidBy: user.id,
      splitType: "equal",
      splitBetween: [],
      customSplits: {},
    });
    setEditingId(null);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      category: form.category,
      amount: form.amount,
      comments: form.comments,
      paymentMethod: form.paymentMethod || undefined,
    };

    if (form.isShared) {
      payload.isShared = true;
      payload.household = form.household;
      payload.paidBy = form.paidBy;
      payload.splitType = form.splitType;

      if (form.splitType === "equal") {
        payload.splits = form.splitBetween;
      } else {
        payload.splits = form.splitBetween.map((uid) => ({
          user: uid,
          amount: Number(form.customSplits[uid] || 0),
        }));
      }
    }

    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, payload);
        setMessage("Expense updated successfully.");
      } else {
        await api.post("/expenses", payload);
        setMessage("Expense added successfully.");
      }

      resetForm();
      await loadExpenses();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
    }
  }

  function editExpense(expense) {
    setEditingId(expense._id);
    setForm({
      category: expense.category,
      amount: expense.amount,
      comments: expense.comments || "",
      paymentMethod: expense.paymentMethod || "",
      isShared: expense.isShared || false,
      household: expense.household?._id || expense.household || "",
      paidBy: expense.paidBy?._id || expense.paidBy || user.id,
      splitType: "equal",
      splitBetween: expense.splits?.map((s) => s.user?._id || s.user) || [],
      customSplits: Object.fromEntries(
        (expense.splits || []).map((s) => [
          s.user?._id || s.user,
          s.amount,
        ])
      ),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExpense(id) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      setMessage("Expense deleted successfully.");
      if (editingId === id) resetForm();
      await loadExpenses();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  }

  // Toggle split member
  function toggleSplitMember(uid) {
    setForm((prev) => {
      const sb = prev.splitBetween.includes(uid)
        ? prev.splitBetween.filter((id) => id !== uid)
        : [...prev.splitBetween, uid];
      return { ...prev, splitBetween: sb };
    });
  }

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  const transactionCount = expenses.length;
  const average = transactionCount > 0 ? total / transactionCount : 0;
  const highest =
    transactionCount > 0
      ? Math.max(...expenses.map((e) => Number(e.amount)))
      : 0;

  const categories = [
    ...new Set(expenses.map((expense) => expense.category)),
  ];

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (search.trim()) {
      const searchText = search.toLowerCase();
      result = result.filter(
        (expense) =>
          expense.category?.toLowerCase().includes(searchText) ||
          expense.comments?.toLowerCase().includes(searchText)
      );
    }

    if (filterCategory !== "All") {
      result = result.filter(
        (expense) => expense.category === filterCategory
      );
    }

    if (filterPayment !== "All") {
      result = result.filter(
        (expense) => expense.paymentMethod === filterPayment
      );
    }

    result.sort((a, b) => {
      if (sortBy === "highest") return Number(b.amount) - Number(a.amount);
      if (sortBy === "lowest") return Number(a.amount) - Number(b.amount);
      if (sortBy === "oldest")
        return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }, [expenses, search, filterCategory, filterPayment, sortBy]);

  const chartData = useMemo(() => {
    const grouped = {};
    expenses.forEach((expense) => {
      grouped[expense.category] =
        (grouped[expense.category] || 0) + Number(expense.amount);
    });

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          data: Object.values(grouped),
          borderWidth: 3,
          borderColor: "#ffffff",
          backgroundColor: [
            "#7c3aed",
            "#2563eb",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#ec4899",
            "#06b6d4",
            "#8b5cf6",
          ],
        },
      ],
    };
  }, [expenses]);

  const monthlyData = useMemo(() => {
    const grouped = {};
    expenses.forEach((expense) => {
      const date = new Date(expense.createdAt);
      const month = date.toLocaleString("en-IN", { month: "short" });
      grouped[month] = (grouped[month] || 0) + Number(expense.amount);
    });

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          label: "Expenses",
          data: Object.values(grouped),
          backgroundColor: [
            "#7c3aed",
            "#2563eb",
            "#10b981",
            "#f59e0b",
            "#ec4899",
            "#06b6d4",
          ],
          borderRadius: 8,
        },
      ],
    };
  }, [expenses]);

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  const selectedHousehold = households.find((h) => h._id === form.household);

  return (
    <div className="app-shell">
      <Topbar user={user} onLogout={onLogout} />

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h1>
              Good to see you,{" "}
              <span>{user.name?.split(" ")[0]}</span> 👋
            </h1>
            <p className="muted hero-text">
              Keep track of your spending and stay in control of your
              finances.
            </p>
          </div>

          <div className="hero-total">
            <span>Total Spending</span>
            <strong>₹{total.toFixed(2)}</strong>
            <small>Across all transactions</small>
          </div>
        </section>

        {error && <div className="error banner">{error}</div>}
        {message && <div className="success banner">✓ {message}</div>}

        <section className="stats-grid">
          <div className="stat-card purple">
            <div className="stat-icon">₹</div>
            <div>
              <span>Total Expenses</span>
              <strong>₹{total.toFixed(2)}</strong>
            </div>
          </div>

          <div className="stat-card blue">
            <div className="stat-icon">#</div>
            <div>
              <span>Transactions</span>
              <strong>{transactionCount}</strong>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon">↗</div>
            <div>
              <span>Average Expense</span>
              <strong>₹{average.toFixed(2)}</strong>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-icon">★</div>
            <div>
              <span>Highest Expense</span>
              <strong>₹{highest.toFixed(2)}</strong>
            </div>
          </div>
        </section>

        <section className="grid main-grid">
          {/* ── ADD / EDIT FORM ── */}
          <div className="card form-card">
            <div className="card-title">
              <div>
                <span className="section-label">
                  {editingId ? "UPDATE" : "NEW TRANSACTION"}
                </span>
                <h2>{editingId ? "Edit Expense" : "Add an Expense"}</h2>
              </div>
              {editingId && (
                <button className="cancel-button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={submit} className="expense-form">
              <label>
                Category
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="Food, Travel, Bills..."
                  required
                />
              </label>

              <label>
                Amount
                <div className="amount-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </label>

              {/* Payment Method */}
              <label>
                Payment Method{" "}
                <span className="optional">(optional)</span>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value })
                  }
                >
                  <option value="">Not specified</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>

              <label>
                Comments{" "}
                <span className="optional">(optional)</span>
                <textarea
                  value={form.comments}
                  onChange={(e) =>
                    setForm({ ...form, comments: e.target.value })
                  }
                  placeholder="What was this expense for?"
                  rows="3"
                />
              </label>

              {/* Shared Expense Toggle */}
              <div className="toggle-row">
                <span className="toggle-label">Shared Expense?</span>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={!form.isShared ? "toggle-active" : "toggle-btn"}
                    onClick={() =>
                      setForm({ ...form, isShared: false })
                    }
                  >
                    No — Personal
                  </button>
                  <button
                    type="button"
                    className={form.isShared ? "toggle-active" : "toggle-btn"}
                    onClick={() =>
                      setForm({ ...form, isShared: true })
                    }
                    disabled={households.length === 0}
                    title={
                      households.length === 0
                        ? "Create a household first"
                        : undefined
                    }
                  >
                    Yes — Split
                  </button>
                </div>
                {households.length === 0 && (
                  <button
                    type="button"
                    className="link-button"
                    style={{ fontSize: 12 }}
                    onClick={() => navigate("/household")}
                  >
                    Create a household →
                  </button>
                )}
              </div>

              {/* Shared Expense Fields */}
              {form.isShared && (
                <div className="shared-fields">
                  <label>
                    Household
                    <select
                      value={form.household}
                      onChange={(e) =>
                        setForm({ ...form, household: e.target.value })
                      }
                      required={form.isShared}
                    >
                      <option value="">Select household…</option>
                      {households.map((h) => (
                        <option key={h._id} value={h._id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedHousehold && (
                    <>
                      <label>
                        Paid By
                        <select
                          value={form.paidBy}
                          onChange={(e) =>
                            setForm({ ...form, paidBy: e.target.value })
                          }
                        >
                          {selectedHousehold.members.map((m) => (
                            <option key={m._id} value={m._id.toString()}>
                              {m.name}
                              {m._id.toString() === user.id ? " (You)" : ""}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="split-section">
                        <div className="split-type-row">
                          <span className="toggle-label">Split Type</span>
                          <div className="toggle-group">
                            <button
                              type="button"
                              className={
                                form.splitType === "equal"
                                  ? "toggle-active"
                                  : "toggle-btn"
                              }
                              onClick={() =>
                                setForm({ ...form, splitType: "equal" })
                              }
                            >
                              Equal
                            </button>
                            <button
                              type="button"
                              className={
                                form.splitType === "custom"
                                  ? "toggle-active"
                                  : "toggle-btn"
                              }
                              onClick={() =>
                                setForm({ ...form, splitType: "custom" })
                              }
                            >
                              Custom
                            </button>
                          </div>
                        </div>

                        <p className="section-label" style={{ margin: "10px 0 6px" }}>
                          {form.splitType === "equal"
                            ? "SPLIT BETWEEN"
                            : "CUSTOM AMOUNTS"}
                        </p>

                        {selectedHousehold.members.map((m) => {
                          const uid = m._id.toString();
                          const isSelected = form.splitBetween.includes(uid);
                          const equalShare =
                            form.splitBetween.length > 0 &&
                            form.splitType === "equal"
                              ? (
                                  Number(form.amount) / form.splitBetween.length
                                ).toFixed(2)
                              : null;

                          return (
                            <div
                              key={uid}
                              className={`split-member-row ${isSelected ? "selected" : ""}`}
                            >
                              <label className="split-member-check">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSplitMember(uid)}
                                />
                                <span>
                                  {m.name}
                                  {uid === user.id && (
                                    <span className="you-badge">You</span>
                                  )}
                                </span>
                              </label>
                              {isSelected && form.splitType === "equal" && equalShare && (
                                <span className="split-equal-amount">
                                  ₹{equalShare}
                                </span>
                              )}
                              {isSelected && form.splitType === "custom" && (
                                <div
                                  className="amount-input"
                                  style={{ width: 130 }}
                                >
                                  <span>₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.customSplits[uid] || ""}
                                    onChange={(e) =>
                                      setForm({
                                        ...form,
                                        customSplits: {
                                          ...form.customSplits,
                                          [uid]: e.target.value,
                                        },
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
                    </>
                  )}
                </div>
              )}

              <button className="primary submit-button">
                {editingId ? "Update Expense ✓" : "Add Expense +"}
              </button>
            </form>
          </div>

          {/* ── CHART ── */}
          <div className="card chart-card">
            <div className="card-title">
              <div>
                <span className="section-label">ANALYTICS</span>
                <h2>Spending by Category</h2>
              </div>
            </div>

            {expenses.length ? (
              <div className="chart-wrap">
                <Doughnut data={chartData} options={pieOptions} />
              </div>
            ) : (
              <div className="empty">
                <div>
                  <div className="empty-icon">📊</div>
                  <p>Add expenses to see your category analytics.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── TREND CHART ── */}
        <section className="card trend-card">
          <div className="card-title">
            <div>
              <span className="section-label">INSIGHTS</span>
              <h2>Expense Trend</h2>
            </div>
            <span className="record-count">{transactionCount} total records</span>
          </div>

          {expenses.length ? (
            <div className="bar-chart-wrap">
              <Bar data={monthlyData} options={barOptions} />
            </div>
          ) : (
            <div className="empty">
              Add expenses to see your spending trend.
            </div>
          )}
        </section>

        {/* ── EXPENSE TABLE ── */}
        <section className="card table-card">
          <div className="table-header">
            <div>
              <span className="section-label">TRANSACTIONS</span>
              <h2>Expense History</h2>
            </div>
            <span className="record-count">
              {filteredExpenses.length} shown
            </span>
          </div>

          {/* Filters */}
          <div className="filters" style={{ gridTemplateColumns: "1fr 160px 160px 160px" }}>
            <div className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search expenses..."
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              <option value="All">All Payments</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>

          {loading ? (
            <div className="empty">
              <div className="loader"></div>
              Loading expenses...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty">
              <div>
                <div className="empty-icon">🧾</div>
                <p>
                  {expenses.length
                    ? "No expenses match your search."
                    : "No expenses yet. Add your first expense above."}
                </p>
              </div>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th>Comments</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense._id}>
                      <td>
                        {expense.isShared ? (
                          <span className="shared-badge">👥 Shared</span>
                        ) : (
                          <span className="personal-badge">Personal</span>
                        )}
                      </td>
                      <td>
                        <span className="category-badge">
                          {expense.category}
                        </span>
                      </td>
                      <td>
                        <strong className="amount">
                          ₹{Number(expense.amount).toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        {expense.paymentMethod ? (
                          <span className="payment-badge">
                            {expense.paymentMethod}
                          </span>
                        ) : (
                          <span style={{ color: "#aaa" }}>—</span>
                        )}
                      </td>
                      <td>{formatDate(expense.createdAt)}</td>
                      <td>{formatDate(expense.updatedAt)}</td>
                      <td className="comments">
                        {expense.comments || "—"}
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="small edit"
                            onClick={() => editExpense(expense)}
                          >
                            Edit
                          </button>
                          <button
                            className="small danger"
                            onClick={() => deleteExpense(expense._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>ExpenseFlow</span>
        <span>Personal Expense Management System</span>
      </footer>
    </div>
  );
}

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

export default App;