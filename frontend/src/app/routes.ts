import { useEffect, useState } from "react";

export const ROUTES = [
  { id: "home", label: "Overview", short: "Home" },
  { id: "draft", label: "Draft a contract", short: "Draft" },
  { id: "review", label: "Review a contract", short: "Review" },
  { id: "recover", label: "Recover a late payment", short: "Recover" },
  { id: "evidence", label: "Prove a document", short: "Prove" },
] as const;

export type RouteId = (typeof ROUTES)[number]["id"];

export function parseHash(): RouteId {
  const h = location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  return (ROUTES.find((r) => r.id === h)?.id ?? "home") as RouteId;
}

export function navigate(id: RouteId) {
  location.hash = id === "home" ? "" : id;
}

export function useRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(parseHash);
  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
