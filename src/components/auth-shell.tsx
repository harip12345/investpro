"use client";

import { createContext, FormEvent, ReactNode, useContext, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  UserRound,
  UserRoundPlus
} from "lucide-react";

type AuthMode = "welcome" | "login" | "register";

interface AuthSession {
  name: string;
  email: string | null;
  role: "member" | "guest";
}

interface StoredAccount {
  name: string;
  email: string;
  passwordHash: string;
}

interface AuthContextValue {
  session: AuthSession;
  signOut: () => void;
}

const SESSION_KEY = "investpro-session";
const ACCOUNTS_KEY = "investpro-accounts";
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthShell");
  return value;
}

export function AuthShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (stored) setSession(JSON.parse(stored) as AuthSession);
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  const startSession = (nextSession: AuthSession) => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const signOut = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Activity className="animate-pulse text-sky-400" size={32} aria-label="Memuat InvestPro" />
      </div>
    );
  }

  if (!session) return <AuthScreen onAuthenticated={startSession} />;

  return <AuthContext.Provider value={{ session, signOut }}>{children}</AuthContext.Provider>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("welcome");

  return (
    <main className="relative min-h-screen bg-zinc-950">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/auth-investment-desk.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/65" aria-hidden="true" />

      <div className="relative flex min-h-screen items-center px-4 py-8 sm:px-8 lg:px-16">
        <section className="w-full max-w-md border border-zinc-700 bg-zinc-950/95 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-sky-500 text-zinc-950">
              <Activity size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white">InvestPro</h1>
              <p className="text-sm text-zinc-400">Ruang kerja investasi Indonesia</p>
            </div>
          </div>

          {mode === "welcome" && <Welcome onChangeMode={setMode} onGuest={() => onAuthenticated({ name: "Tamu", email: null, role: "guest" })} />}
          {mode === "login" && <LoginForm onBack={() => setMode("welcome")} onAuthenticated={onAuthenticated} />}
          {mode === "register" && <RegisterForm onBack={() => setMode("welcome")} onAuthenticated={onAuthenticated} />}
        </section>
      </div>
    </main>
  );
}

function Welcome({ onChangeMode, onGuest }: { onChangeMode: (mode: AuthMode) => void; onGuest: () => void }) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase text-sky-400">Selamat datang</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Mulai dengan pilihan Anda</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Masuk untuk melanjutkan sesi atau jelajahi aplikasi tanpa membuat akun.</p>
      </div>

      <div className="grid gap-3">
        <button type="button" onClick={() => onChangeMode("login")} className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-sky-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-sky-400">
          <LogIn size={18} /> Masuk
        </button>
        <button type="button" onClick={() => onChangeMode("register")} className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-zinc-600 bg-zinc-900 px-4 py-3 font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800">
          <UserRoundPlus size={18} /> Daftar akun
        </button>
        <button type="button" onClick={onGuest} className="flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white">
          Lanjut sebagai tamu <ArrowRight size={17} />
        </button>
      </div>

      <div className="mt-8 flex items-center gap-2 border-t border-zinc-800 pt-5 text-xs text-zinc-500">
        <ShieldCheck size={15} className="text-emerald-400" />
        Sesi akun tersimpan hanya di perangkat ini.
      </div>
    </div>
  );
}

function LoginForm({ onBack, onAuthenticated }: { onBack: () => void; onAuthenticated: (session: AuthSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const accounts = getAccounts();
      const account = accounts.find((item) => item.email === email.trim().toLowerCase());
      const passwordHash = await hashPassword(password);
      if (!account || account.passwordHash !== passwordHash) {
        setError("Email atau kata sandi tidak sesuai.");
        return;
      }
      onAuthenticated({ name: account.name, email: account.email, role: "member" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <AuthHeading title="Masuk ke akun" subtitle="Gunakan akun yang pernah didaftarkan di perangkat ini." onBack={onBack} />
      <form onSubmit={submit} className="grid gap-5">
        <Field label="Email">
          <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className="auth-input" />
        </Field>
        <PasswordField value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="current-password" />
        {error && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={submitting} className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-sky-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60">
          <LogIn size={18} /> {submitting ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}

function RegisterForm({ onBack, onAuthenticated }: { onBack: () => void; onAuthenticated: (session: AuthSession) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (name.trim().length < 2) return setError("Nama minimal 2 karakter.");
    if (password.length < 8) return setError("Kata sandi minimal 8 karakter.");
    if (password !== confirmation) return setError("Konfirmasi kata sandi tidak sama.");

    const accounts = getAccounts();
    if (accounts.some((item) => item.email === normalizedEmail)) return setError("Email ini sudah terdaftar.");

    setSubmitting(true);
    try {
      const account: StoredAccount = { name: name.trim(), email: normalizedEmail, passwordHash: await hashPassword(password) };
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
      onAuthenticated({ name: account.name, email: account.email, role: "member" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <AuthHeading title="Buat akun" subtitle="Siapkan identitas untuk sesi InvestPro Anda." onBack={onBack} />
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Nama">
          <input type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap" className="auth-input" />
        </Field>
        <Field label="Email">
          <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className="auth-input" />
        </Field>
        <PasswordField value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
        <Field label="Konfirmasi kata sandi">
          <input type={showPassword ? "text" : "password"} autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Ulangi kata sandi" className="auth-input" />
        </Field>
        {error && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={submitting} className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-md bg-sky-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60">
          <UserRoundPlus size={18} /> {submitting ? "Membuat akun..." : "Daftar dan masuk"}
        </button>
      </form>
    </div>
  );
}

function AuthHeading({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="mb-7">
      <button type="button" onClick={onBack} aria-label="Kembali" className="mb-5 rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
        <ArrowLeft size={19} />
      </button>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-300">
      {label}
      {children}
    </label>
  );
}

function PasswordField({
  value,
  onChange,
  visible,
  onToggle,
  autoComplete
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: "current-password" | "new-password";
}) {
  return (
    <Field label="Kata sandi">
      <span className="relative">
        <input type={visible ? "text" : "password"} autoComplete={autoComplete} required value={value} onChange={(event) => onChange(event.target.value)} placeholder="Minimal 8 karakter" className="auth-input pr-11" />
        <button type="button" onClick={onToggle} aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 hover:text-white">
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </Field>
  );
}

function getAccounts(): StoredAccount[] {
  try {
    const stored = window.localStorage.getItem(ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) as StoredAccount[] : [];
  } catch {
    return [];
  }
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
