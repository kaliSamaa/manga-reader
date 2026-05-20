import { useState } from "react";
import { hasAnyUser, createUser, verifyUser, saveSession } from "../storage.js";

export default function Login({ onLogin }) {
  const isFirstRun = !hasAnyUser();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError("Username and password required.");
      return;
    }
    setLoading(true);
    try {
      if (isFirstRun) {
        await createUser(username.trim(), password, true);
        const user = await verifyUser(username.trim(), password);
        saveSession(user);
        onLogin(user);
      } else {
        const user = await verifyUser(username.trim(), password);
        if (!user) { setError("Invalid username or password."); setLoading(false); return; }
        saveSession(user);
        onLogin(user);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-mark">M</div>
          <div>
            <div className="logo-text">Manki</div>
            <div className="logo-sub">Manga Reader</div>
          </div>
        </div>

        {isFirstRun && (
          <div className="login-notice">
            First launch — create your admin account.
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">Username</label>
            <input
              className="login-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              className="login-input"
              type="password"
              autoComplete={isFirstRun ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "…" : isFirstRun ? "Create account & sign in" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
