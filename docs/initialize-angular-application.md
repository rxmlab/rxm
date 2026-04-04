# How to initialise your Angular application for real deployments

**Author:** Ram Jawade  
**Repository:** [rxmlab/rxm](https://github.com/rxmlab/rxm)

Modern Angular apps are often shipped as static files behind nginx, served from object storage, or baked into a container image. That raises a tension: **compile-time** `environment.ts` files are easy to use in development, but they fight the goal of **one build, many deployments**. This post walks through a pattern that fits cloud and Docker workflows, explains when you can skip an explicit API base URL, and shows how a small **environment service** can route HTTP calls to the right microservice in each stage (dev, QA, production).

---

## 1. Build once, deploy many times

### The problem

If you bake API URLs into the bundle at build time (for example by swapping `environment.prod.ts` per pipeline stage), you need **a separate artefact per environment**. That complicates promotion: the binary you tested in QA is not literally the same as what you run in production.

### The approach: runtime configuration

A common pattern is:

1. **Build the Angular app once** with a neutral configuration (no stage-specific API hosts in the compiled code).
2. At **startup**, load a small JSON file (for example `assets/env.json`) with URLs and service metadata for *this* deployment.
3. In **Docker or Kubernetes**, you do not rebuild the image to change API endpoints—you **replace or mount** that JSON file (or generate it from environment variables in an entrypoint script).

In this workspace, that load happens in an app initializer that fetches `assets/env.json` and registers the result with an injectable service (see `initializeEnvironment` and `EnvironmentService`). The app does not call backend APIs that depend on that config until the initializer has finished, which keeps race conditions under control.

**Practical deployment tips**

- **Docker**: copy a default `env.json` into the image, then override at run time (paths inside the image depend on how you serve the SPA—for example nginx):

  ```bash
  docker run -v ./env.prod.json:/usr/share/nginx/html/assets/env.json:ro
  ```
- **Kubernetes**: mount a `ConfigMap` (or Secret) as `assets/env.json`, or use an init container / entrypoint to write the file from env vars.
- **CI/CD**: one pipeline produces one image or one static artefact; a later deploy step only swaps config, not the bundle.

---

## 2. When the UI and backend share the same environment, you may not need a full `baseUrl`

Browsers resolve relative URLs against the **current origin** (`window.location.origin`). If the SPA and the API gateway (or BFF) are served from the **same host and scheme**—typical when a reverse proxy routes `/` to the SPA and `/api/...` to services—you can describe the API with a **relative** base path instead of `https://api.company.com`.

Your `IMicroService` model reflects that idea: a `baseUrl` that does **not** start with `http` is treated as relative to the app’s origin, so calls stay on the same deployment without hard-coding the public hostname. When you truly call another host (another cluster, a legacy API, or a third-party service), use a full URL (`https://...`) in `baseUrl` for that microservice entry.

That way:

- **Same environment / same origin**: relative `baseUrl` (for example `""`, `/gateway`, or `/api`) keeps configuration minimal and portable.
- **Cross-origin**: absolute `baseUrl` makes the intent explicit and works as long as CORS (and cookies, if used) are configured correctly.

---

## 3. How an environment service helps you talk to different microservices

Backend systems are rarely a single monolith URL. You might have a **user** service, an **orders** service, and a **gateway**—each with its own path prefix or host.

An environment service can hold a **registry** of named microservices, each with:

- **`name`**: logical key your code uses (`users`, `orders`, …).
- **`baseUrl`**: origin or prefix (relative or absolute, as above).
- **`context` and `version`**: path segments such as `/users` and `/v1` so URLs stay consistent.
- **`default`**: which service to use when code does not specify a name.

HTTP wrappers (for example a thin `HttpService`) can then build the full base by combining those pieces and append the resource path for each request. Features that need a non-default backend pass the service name; everything else uses the default gateway or API.

That keeps **feature code** free of hard-coded hosts and paths: it only cares about relative paths and, when needed, which microservice alias to use.

---

## 4. Managing dev, QA, staging, and production

Runtime `env.json` (or the same shape under another filename) gives you a clear split of concerns:

| Concern | Where it lives |
|--------|----------------|
| Application code and bundle | One build artefact |
| Per-stage URLs and service list | `env.json` (or mounted equivalent) per environment |

**Typical workflow**

1. Maintain **example** files in source control: `env.json.example`, or `config/env.dev.json`, `config/env.qa.json`, `config/env.prod.json`—without secrets; real secrets belong in the platform store, not in git.
2. **Local dev**: serve an `env.json` that points to localhost or a shared dev cluster.
3. **QA / staging / prod**: the **same** Docker image or static folder, with **different** `env.json` content supplied by the environment.

You can generate that file from CI variables or from the orchestrator so operators never rebuild the frontend to change a backend URL.

---

## 5. Putting it together in Angular

1. **`provideHttpClient()`** and an **`APP_INITIALIZER`** (or `provideAppInitializer`) that runs **before** the app is ready.
2. The initializer **GET**s `assets/env.json`, parses it, and calls something like `environmentService.setMicroServices(...)`.
3. Services that call APIs **inject** the environment service (and optionally a small HTTP facade) and use **named** or **default** microservice resolution for every outbound URL.

This matches how many teams run Angular in Kubernetes or behind a corporate gateway: **one image, many configs**, optional same-origin relative bases, and a single place to describe how the UI reaches each microservice in every environment.

---

## Example

This workspace follows the pattern with a concrete `assets/env.json`, an app initializer, and a thin HTTP facade.

### Runtime config (`src/assets/env.json`)

The file is an **array** of microservice descriptors. One entry should set `"default": true` (or the first entry is used as the default).

```json
[
  {
    "baseUrl": "https://api.example.com",
    "context": "/users",
    "version": "/v1",
    "default": true,
    "name": "users"
  },
  {
    "baseUrl": "/gateway",
    "context": "/orders",
    "version": "v1",
    "name": "orders"
  }
]
```

- **`users`**: absolute `baseUrl` for a dedicated API host; marked default so unnamed calls go here.
- **`orders`**: relative `baseUrl` (`/gateway`) for same-origin routing through a gateway; no `default`, so code must pass the service name when you want this backend.

### Bootstrap (`src/app/app.config.ts`)

`provideHttpClient()` is registered together with `provideAppInitializer(initializeEnvironment)` so the initializer can fetch `assets/env.json` before the rest of the app runs:

```typescript
import { ApplicationConfig, provideAppInitializer } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { initializeEnvironment } from '@rxm/core';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    provideAppInitializer(initializeEnvironment),
    provideHttpClient(),
  ],
};
```

### Initializer (`initializeEnvironment`)

The initializer injects `HttpClient` and `EnvironmentService`, loads `assets/env.json`, and calls `environmentService.setMicroServices(json)` so the registry is ready before routed components load.

### Feature code

Inject `HttpService` and use **path-only** URLs for the default microservice; the service combines `baseUrl`, `context`, and `version` from the loaded config before issuing the request.

```typescript
// Illustrative: resolves against the default microservice from env.json
this.httpService.get<Profile>('/profile');
```

To target a named microservice (for example `orders`), extend your HTTP layer to pass a service name into `EnvironmentService#getContext(serviceName)`—the same way you would for multiple backends.

---

## Summary

- **Build once, deploy many**: load API and microservice configuration at runtime (for example `assets/env.json`), and swap or mount that file per environment instead of rebuilding.
- **UI and BE on the same origin**: prefer relative `baseUrl` values so you do not duplicate the public hostname; use absolute URLs when the API is on another host.
- **Environment service**: register named microservices with `baseUrl`, `context`, and `version`, resolve a default, and centralise URL construction for your HTTP layer.
- **dev / QA / prod**: keep one bundle; vary only the runtime config file (or generated config) per stage.
- **Example**: this repo’s `assets/env.json`, `app.config.ts`, and `initializeEnvironment` show the pattern end to end (see **Example** above).

If you adopt this pattern, your Angular initialisation story stays aligned with cloud-native deployment: the app starts, loads its map of backends, then serves users with the right endpoints everywhere you deploy the same build.
