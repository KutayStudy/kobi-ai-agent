import { cx } from "./ui.jsx";

export default function Navbar({ route, onNav }) {
  return (
    <header className="border-b border-ink-200 bg-paper/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              onNav("dashboard");
            }}
            className="flex items-center gap-2.5"
          >
            <span className="grid place-items-center w-7 h-7 rounded-md bg-ink-900 text-paper">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 13L6 7L9.5 10.5L14 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="14" cy="3" r="1.4" fill="currentColor" />
              </svg>
            </span>
            <span className="font-medium tracking-tight text-ink-900">kobiOS</span>
          </a>
          <nav className="flex items-center gap-1">
            <NavLink active={route === "dashboard"} onClick={() => onNav("dashboard")}>
              Operasyon Paneli
            </NavLink>
            <NavLink active={route === "customer"} onClick={() => onNav("customer")}>
              Müşteri Asistanı
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-ink-500">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" /> canlı
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-300/70 bg-emerald-50 text-emerald-800 text-[11px] font-mono uppercase tracking-wider">
            FastAPI
          </span>
        </div>
      </div>
    </header>
  );
}

function NavLink({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "px-3 py-1.5 text-[13px] rounded-md transition-colors",
        active ? "text-ink-900 bg-ink-100" : "text-ink-500 hover:text-ink-900 hover:bg-ink-50",
      )}
    >
      {children}
    </button>
  );
}
