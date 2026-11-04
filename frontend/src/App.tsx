import * as RTooltip from "@radix-ui/react-tooltip";
import { lazy, Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { ROUTES, useRoute } from "./app/routes";
import { Shell } from "./app/Shell";
import { api } from "./api";
import { Button } from "./components/ui/Button";
import { Notice } from "./components/ui/Primitives";
import type { Meta } from "./types";
import { Home } from "./views/Home";

const Draft = lazy(() => import("./views/Draft").then((m) => ({ default: m.Draft })));
const Review = lazy(() => import("./views/Review").then((m) => ({ default: m.Review })));
const Recover = lazy(() => import("./views/Recover").then((m) => ({ default: m.Recover })));
const Evidence = lazy(() => import("./views/Evidence").then((m) => ({ default: m.Evidence })));

function Loading() {
  return (
    <div className="p-8" role="status" aria-live="polite">
      <div className="h-6 w-56 animate-pulse rounded bg-mist-200" />
      <div className="mt-4 h-40 animate-pulse rounded-xl bg-mist-200" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    setErr(null);
    api.meta().then(setMeta).catch((e) => setErr(e.message));
  }, [tries]);

  useEffect(() => {
    document.title = route === "home" ? "Clausewright" : `${ROUTES.find((r) => r.id === route)!.label} · Clausewright`;
  }, [route]);

  const page = () => {
    if (route === "home") return <Home meta={meta} />;
    if (err) return (
      <div className="p-8">
        <Notice tone="err" role="alert">
          <strong>Cannot reach the Clausewright server.</strong> {err}
          <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => setTries((t) => t + 1)}>Retry</Button></div>
        </Notice>
      </div>
    );
    if (!meta) return <Loading />;
    return (
      <Suspense fallback={<Loading />}>
        {route === "draft" && <Draft meta={meta} />}
        {route === "review" && <Review llm={meta.llm_enabled} />}
        {route === "recover" && <Recover meta={meta} />}
        {route === "evidence" && <Evidence />}
      </Suspense>
    );
  };

  return (
    <RTooltip.Provider>
      <Shell route={route} meta={meta}>
        <ErrorBoundary key={route} label={ROUTES.find((r) => r.id === route)?.label}>{page()}</ErrorBoundary>
      </Shell>
    </RTooltip.Provider>
  );
}
