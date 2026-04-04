# Initialise Angular for cloud & Docker (build once, deploy many)

**Author:** Ram Jawade

**Repository:** [https://github.com/rxmlab/rxm](https://github.com/rxmlab/rxm)

---

## How to use this doc

**~1 min read**

There are two layers: a **full guide** that explains the problem, the pattern, and how it maps to Angular and ops, and a **quick reference** with tables and copy-paste examples. Start with either; the links below jump to the matching section.

**Jump to a whole part:** [Full guide](#full-guide) · [Quick reference](#quick-reference)

### Full guide (~5 min read)

Concepts and narrative — read this first if you want the “why” and full picture.

| Section | What you get |
|--------|----------------|
| [Build once, deploy many](#fg-build-once) | Runtime config vs compile-time `environment.ts`, Docker/K8s/CI |
| [Same origin / `baseUrl`](#fg-same-origin) | When UI and API share a host — relative URLs |
| [Environment service & microservices](#fg-microservices) | Named backends, default service, URL composition |
| [Dev, QA, production](#fg-stages) | One bundle, different `env.json` per stage |
| [Angular wiring](#fg-angular) | Initializer + HTTP client bootstrap |
| [Summary](#fg-summary) | Bullet recap |

### Quick reference (~2 min read)

Scan or copy examples — tables, JSON, Docker, and the one-line “why.”

| Section | What you get |
|--------|----------------|
| [TL;DR table](#qr-tldr) | Goals → actions at a glance |
| [The pattern (3 steps)](#qr-pattern) | Build / boot / deploy |
| [Example `env.json`](#qr-env-json) | Same-origin + external API |
| [Example Angular wiring](#qr-angular) | `provideAppInitializer` snippet |
| [Example deploy](#qr-deploy) | Docker, K8s, CI notes |
| [Staging files](#qr-staging) | `env.dev.json` / `env.qa.json` / `env.prod.json` |
| [Why not `environment.prod.ts`?](#qr-why-env) | One line comparison |

---

<a id="full-guide"></a>

## Full guide

**Estimated read time: ~5 minutes**

<a id="fg-build-once"></a>

### Build once, deploy many

Compile-time `environment.ts` is fine locally, but it bakes API hosts into the bundle. That forces **a different build per stage** (dev, QA, prod), so the artefact you promote is not literally identical everywhere.

**Approach:** build the app **once** with neutral config; at **startup**, `GET` a small JSON file (for example `assets/env.json`) with URLs and microservice metadata. In Docker or Kubernetes, **swap or mount** that file (or generate it in an entrypoint) — **no rebuild** to change endpoints.

In this repo, `initializeEnvironment` loads `assets/env.json` and calls `EnvironmentService.setMicroServices(...)`. The initializer runs before the app is ready, so dependent API calls do not race ahead of config.

**Ops:** Docker volume over `assets/env.json`; Kubernetes `ConfigMap` or init/entrypoint; CI builds once and deploy injects config only.

<a id="fg-same-origin"></a>

### Same origin / `baseUrl`

If the SPA and API (or gateway/BFF) share **same scheme + host** — common with a reverse proxy (`/` → static app, `/api/...` → backends) — use a **relative** `baseUrl` (`""`, `/gateway`, `/api`). The browser resolves it against `window.location.origin`, so you do not repeat the public hostname.

If the API lives on **another host**, use a full URL in `baseUrl` (`https://...`) and handle CORS (and cookies if applicable).

This matches `IMicroService`: non-`http` `baseUrl` → same deployment; `http(s)` → explicit cross-origin target.

<a id="fg-microservices"></a>

### Environment service & microservices

Backends are often split (users, orders, gateway). Register each as a **named** entry: `name`, `baseUrl`, `context`, `version`, optional `default`. The environment service resolves **default** when callers omit a name; HTTP helpers prepend the composed base to each path so feature code stays free of hard-coded hosts.

<a id="fg-stages"></a>

### Dev, QA, production

**One bundle**, **different runtime config** per stage. Keep templates like `env.dev.json` / `env.qa.json` / `env.prod.json` in git **without** secrets; inject secrets via your platform. Generate or mount the final `assets/env.json` per environment.

<a id="fg-angular"></a>

### Angular wiring

Provide `HttpClient`, then `provideAppInitializer(initializeEnvironment)` so config loads first. Services inject `EnvironmentService` (and optionally a thin `HttpService`) to build request URLs.

<a id="fg-summary"></a>

### Full guide summary

- **Build once, deploy many:** runtime `env.json` (mount/replace per deploy), not per-stage builds.
- **Same origin:** relative `baseUrl`; absolute URL when the API is elsewhere.
- **Microservices:** named registry + default + composed `baseUrl` / `context` / `version`.
- **Stages:** same artefact; vary only config.

---

<a id="quick-reference"></a>

## Quick reference

**Estimated read time: ~2 minutes**

<a id="qr-tldr"></a>

### Quick reference — TL;DR

| Goal | Do this |
|------|--------|
| One Docker image for dev / QA / prod | Load `assets/env.json` at **startup**, not at **build** |
| UI + API same host | Use **relative** `baseUrl` (e.g. `/gateway`) — no hard-coded domain |
| Many backends | One **registry** in JSON; **EnvironmentService** builds URLs; optional **default** service |

<a id="qr-pattern"></a>

### Quick reference — the pattern

1. **Build once** — no per-stage API URLs in the bundle.  
2. **On boot** — `APP_INITIALIZER` fetches `assets/env.json` and calls `setMicroServices(...)`.  
3. **Per deploy** — swap or mount `env.json` only (same artefact everywhere).

<a id="qr-env-json"></a>

### Quick reference — example `env.json`

Same-origin gateway + external API:

```json
[
  {
    "name": "users",
    "baseUrl": "https://api.example.com",
    "context": "/users",
    "version": "/v1",
    "default": true
  },
  {
    "name": "orders",
    "baseUrl": "/gateway",
    "context": "/orders",
    "version": "/v1"
  }
]
```

- **`baseUrl`** starts with `http` → full host. Otherwise → relative to `window.location.origin`.  
- **`default: true`** → used when your HTTP helper does not pick a named service.

<a id="qr-angular"></a>

### Quick reference — example Angular wiring

```typescript
// app.config.ts
provideAppInitializer(initializeEnvironment),
provideHttpClient(),
```

Initializer loads JSON and registers services (see `libs/.../environment.initializer.ts` and `EnvironmentService` in this repo).

<a id="qr-deploy"></a>

### Quick reference — example deploy

**Docker** (mount config over the baked-in file; adjust path to your image):

```bash
docker run -v ./env.qa.json:/usr/share/nginx/html/assets/env.json:ro my-app:1.0.0
```

**Kubernetes** — `ConfigMap` volume mounted at `assets/env.json`, or init/entrypoint that writes the file from env vars.

**CI** — one job builds the image; deploy jobs only inject the right `env.json` per environment.

<a id="qr-staging"></a>

### Quick reference — staging files

Keep **`env.dev.json`**, **`env.qa.json`**, **`env.prod.json`** (or templates) **outside** secrets in git; inject real secrets via your platform. **Same bundle** + **different file** per stage.

<a id="qr-why-env"></a>

### Quick reference — why not `environment.prod.ts`?

Compile-time env = **new build per stage**. Runtime `env.json` = **one build**, change URLs by config only — aligned with Docker/K8s promotion.
