import Navbar from "./components/Navbar.jsx";
import CustomerView from "./views/CustomerView.jsx";
import DashboardView from "./views/DashboardView.jsx";
import { useEffect, useState } from "react";

function parseRoute() {
  const path = window.location.pathname.replace(/^\/+/, "").trim();
  if (path === "customer") return "customer";
  return "dashboard";
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function nav(nextRoute) {
    window.history.pushState({}, "", `/${nextRoute}`);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar route={route} onNav={nav} />
      <main
        className="flex-1"
        data-screen-label={route === "customer" ? "Müşteri Asistanı" : "Operasyon Paneli"}
      >
        {route === "customer" ? <CustomerView /> : <DashboardView />}
      </main>
    </div>
  );
}
