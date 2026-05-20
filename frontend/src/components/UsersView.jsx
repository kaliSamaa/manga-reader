import { useState } from "react";
import { getUsers, createUser, deleteUser, changePassword } from "../storage.js";

export default function UsersView({ session }) {
  const [users, setUsers] = useState(getUsers());
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [changingPw, setChangingPw] = useState({}); // { username: newPw }

  function refresh() { setUsers(getUsers()); }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!newUsername.trim() || !newPassword.trim()) { setError("Fill in all fields."); return; }
    try {
      await createUser(newUsername.trim(), newPassword, newIsAdmin);
      setSuccess(`User "${newUsername.trim()}" created.`);
      setNewUsername(""); setNewPassword(""); setNewIsAdmin(false);
      refresh();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(username) {
    if (!confirm(`Delete user "${username}"? Their progress will also be removed.`)) return;
    deleteUser(username);
    refresh();
  }

  async function handleChangePw(username) {
    const pw = changingPw[username];
    if (!pw?.trim()) return;
    await changePassword(username, pw);
    setChangingPw(p => ({ ...p, [username]: "" }));
    setSuccess(`Password updated for "${username}".`);
  }

  return (
    <div className="detail-view">
      <h1 className="detail-title" style={{ marginBottom: "1.5rem" }}>User Management</h1>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {/* User list */}
      <div className="chapters-section" style={{ marginBottom: "2rem" }}>
        <h2 className="section-heading">Users <span className="chapter-count">{users.length}</span></h2>
        <div className="chapter-list">
          {users.map(u => (
            <div key={u.username} className="chapter-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <div className="chapter-name">
                  <i className={`fa-solid ${session.isAdmin ? "fa-user-tie" : "fa-user"}`} /> {session.username}
                  {u.username === session.username && <span style={{ color: "var(--overlay0)", fontSize: "0.75rem" }}> (you)</span>}
                </div>
                <div className="chapter-date">Created {new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="chapter-actions" style={{ flexWrap: "wrap" }}>
                <input
                  className="search-input"
                  style={{ width: "120px", fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                  type="password"
                  placeholder="New password"
                  value={changingPw[u.username] ?? ""}
                  onChange={e => setChangingPw(p => ({ ...p, [u.username]: e.target.value }))}
                />
                <button
                  className="chapter-btn read"
                  onClick={() => handleChangePw(u.username)}
                  disabled={!changingPw[u.username]?.trim()}
                >Set pw</button>
                {u.username !== session.username && (
                  <button className="chapter-btn dl" style={{ borderColor: "var(--red)", color: "var(--red)" }} onClick={() => handleDelete(u.username)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create user form */}
      <div className="chapters-section">
        <h2 className="section-heading">Create User</h2>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "360px" }}>
          <div className="login-field">
            <label className="login-label">Username</label>
            <input className="login-input" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
          </div>
          <div className="login-field">
            <label className="login-label">Password</label>
            <input className="login-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--subtext0)", cursor: "pointer" }}>
            <input type="checkbox" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} />
            Admin (can manage users)
          </label>
          <button className="login-btn" type="submit">Create User</button>
        </form>
      </div>
    </div>
  );
}
