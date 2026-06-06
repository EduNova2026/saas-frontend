import { useState, useEffect } from "react";

// ── Tokens design ─────────────────────────────────────────────────────────────
const C = {
  navy:        "#0e1b2e",
  accent:      "#4f8ef7",
  accentHover: "#3a7cf5",
  accentGlow:  "rgba(18, 39, 76, 0.18)",
  text:        "#f0f4ff",
  textSec:     "#8fa3c2",
  textMuted:   "#5a7296",
  border:      "rgba(79,142,247,0.15)",
  inputBg:     "rgba(14,27,46,0.7)",
  errorBg:     "rgba(224,91,91,0.12)",
  errorBorder: "rgba(224,91,91,0.3)",
  success:     "#4abf8a",
  successBg:   "rgba(74,191,138,0.12)",
};

// ── Icônes SVG inline ─────────────────────────────────────────────────────────
const IconMail = ({ color = C.textMuted }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/>
    <path d="M2 8l10 6 10-6"/>
  </svg>
);

const IconLock = ({ color = C.textMuted }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
  </svg>
);

const IconCheck = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.2" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

const Spinner = () => (
  <div style={{
    width: 18, height: 18,
    border: "2px solid rgba(255,255,255,0.35)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  }}/>
);


// ── Styles en objet JS ────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.navy,
    fontFamily: "'DM Sans', sans-serif",
    color: C.text,
    overflow: "hidden",
    padding: 20,
    boxSizing: "border-box"
  },
  
  loginCard: {
    width: "100%",
    maxWidth: 560,
    zIndex: 1,
    padding: "26px 26px 32px",
    borderRadius: 24,
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.16)",
    background: "rgba(14, 27, 46, 0.95)",
  },
  loginHeader: { marginBottom: 42, textAlign: "center" },
  loginTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 42,
    letterSpacing: "-0.4px",
    marginBottom: 10,
    color: C.text,
  },
  loginSubtitle: {
    fontSize: 16,
    color: C.textSec,
    fontWeight: 300,
    margin: 0,
  },
  formGroup: { marginBottom: 26 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: C.textMuted,
    marginBottom: 10,
  },
  inputWrapper: { position: "relative" },
  inputIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    display: "flex",
  },
  input: (focused, error) => ({
    width: "100%",
    height: 58,
    background: focused ? "rgba(23, 99, 212, 0.9)" : C.inputBg,
    border: `1px solid ${error ? C.errorBorder : focused ? C.accent : C.border}`,
    borderRadius: 16,
    padding: "0 48px 0 46px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 16,
    fontWeight: 300,
    color: C.text,
    outline: "none",
    boxShadow: focused ? `0 0 0 4px ${error ? "rgba(224,91,91,0.12)" : C.accentGlow}` : "none",
    transition: "all 0.2s",
    boxSizing: "border-box",
  }),
  
  eyeToggle: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: C.textMuted,
    padding: 4,
    display: "flex",
    transition: "color 0.2s",
  },
  errorBanner: {
    background: C.errorBg,
    border: `1px solid ${C.errorBorder}`,
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 20,
    fontSize: 13,
    color: "#f08080",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  btnLogin: (loading) => ({
    width: "100%",
    height: 58,
    background: C.accent,
    border: "none",
    borderRadius: 16,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 17,
    fontWeight: 600,
    color: "#fff",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
    letterSpacing: "0.02em",
    boxShadow: "0 8px 28px rgba(79,142,247,0.25)",
    opacity: loading ? 0.7 : 1,
  }),
  successOverlay: (visible) => ({
    position: "fixed",
    inset: 0,
    background: C.navy,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 16,
    zIndex: 100,
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "all" : "none",
    transition: "opacity 0.4s",
  }),
  successCheck: {
    width: 76, height: 76,
    borderRadius: "50%",
    background: C.successBg,
    border: `2px solid ${C.success}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 26,
    color: C.text,
  },
  successSub: {
    fontSize: 15,
    color: C.textSec,
    fontWeight: 300,
  },
};

// ── Composant principal ───────────────────────────────────────────────────────
const API_BASE = "/api/v1/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const clearError = () => setError("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.detail || "Email ou mot de passe incorrect.");
        return;
      }

      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;

      if (accessToken) localStorage.setItem("access_token", accessToken);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
      if (data.token_type) localStorage.setItem("token_type", data.token_type);

      const user = data.user || null;
      const resolveRedirect = (userPayload) => {
        const role = (userPayload?.roles?.[0] || "").toLowerCase();
        if (role.includes("admin")) return "/admin/dashboard";
        if (role.includes("responsable")) return "/responsable/dashboard";
        if (role.includes("enseignant")) return "/enseignant/dashboard";
        return "/dashboard";
      };

      if (user) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = resolveRedirect(user);
        }, 1400);
      } else {
        try {
          const meRes = await fetch(`${API_BASE}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const fetchedUser = await meRes.json();
          setSuccess(true);
          setTimeout(() => {
            window.location.href = resolveRedirect(fetchedUser);
          }, 1400);
        } catch {
          setSuccess(true);
          setTimeout(() => { window.location.href = "/dashboard"; }, 1400);
        }
      }

    } catch {
      setError("Impossible de contacter le serveur. Réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (document.getElementById("Edu'Nova-kf")) return;
    const s = document.createElement("style");
    s.id = "Edu'Nova-kf";
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
      @keyframes popIn { from { transform:scale(0.5); opacity:0; } to { transform:scale(1); opacity:1; } }
      .edu-fadeup-0 { animation: fadeUp 0.5s 0.00s ease both; }
      .edu-fadeup-1 { animation: fadeUp 0.5s 0.06s ease both; }
      .edu-fadeup-2 { animation: fadeUp 0.5s 0.12s ease both; }
      .edu-fadeup-3 { animation: fadeUp 0.5s 0.18s ease both; }
      .edu-popIn    { animation: popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both; }
      .edu-btn:hover { background: ${C.accentHover} !important; box-shadow: 0 6px 28px rgba(79,142,247,0.38) !important; }
      .edu-btn:active { transform: scale(0.99); }
      .edu-eye:hover { color: ${C.accent} !important; }
      .edu-input:focus { caret-color: ${C.accent}; }
      .edu-input::placeholder { color: ${C.textMuted}; }
    `;
    document.head.appendChild(s);
  }, []);

  return (
    <>
      {/* Overlay de succès */}
      <div style={styles.successOverlay(success)}>
        <div style={styles.successCheck} className="edu-popIn">
          <IconCheck/>
        </div>
        <p style={styles.successTitle}>Connexion réussie</p>
        <p style={styles.successSub}>Redirection en cours…</p>
      </div>

      <div style={styles.root}>
        {mounted && (
          <div style={styles.loginCard}>
            
            {/* En-tête */}
            <div style={styles.loginHeader} className="edu-fadeup-0">
              <h1 style={styles.loginTitle}>Edu'Nova</h1>
              <p style={styles.loginSubtitle}>Connectez-vous à votre espace</p>
            </div>

            {/* Bannière erreur */}
            {error && (
              <div style={styles.errorBanner} className="edu-fadeup-1">
                <IconAlert/>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div style={styles.formGroup} className="edu-fadeup-1">
                <label htmlFor="email" style={styles.label}>Adresse e-mail</label>
                <div style={styles.inputWrapper}>
                  <input
                    id="email"
                    type="email"
                    className="edu-input"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="vous@junia.com"
                    autoComplete="email"
                    style={styles.input(focusedField === "email", !!error)}
                  />
                  <span style={styles.inputIcon}>
                    <IconMail color={focusedField === "email" ? C.accent : C.textMuted}/>
                  </span>
                </div>
              </div>

              {/* Mot de passe */}
              <div style={styles.formGroup} className="edu-fadeup-2">
                <label htmlFor="password" style={styles.label}>Mot de passe</label>
                <div style={styles.inputWrapper}>
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    className="edu-input"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={styles.input(focusedField === "password", !!error)}
                  />
                  <span style={styles.inputIcon}>
                    <IconLock color={focusedField === "password" ? C.accent : C.textMuted}/>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    style={styles.eyeToggle}
                    className="edu-eye"
                    aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPwd ? <IconEyeOff/> : <IconEye/>}
                  </button>
                </div>
              </div>

              {/* Bouton soumettre */}
              <button
                type="submit"
                disabled={loading}
                style={styles.btnLogin(loading)}
                className="edu-btn edu-fadeup-3"
              >
                {loading ? (
                  <Spinner/>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <IconArrow/>
                  </>
                )}
              </button>
            </form>

          </div>
        )}
      </div>
    </>
  );
}