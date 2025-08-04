# 📘 CLAUDE.md

> **Purpose**: This document provides essential project context and architectural goals for AI-assisted restructuring, particularly the integration of Payload CMS into an Nx-based monorepo that already houses the main website (`edwardnafornita-com`). It is intended for tools like Claude Code or any automated developer assistant to accurately restructure and extend this codebase.

---

## 🧱 Monorepo Architecture

- **Monorepo Tooling**: [Nx](https://nx.dev)
- **Frameworks**:
  - **Frontend**: Next.js (hosted in `apps/edwardnafornita-com`)
  - **Backend**: Planning to integrate [Payload CMS](https://payloadcms.com/) (`create-payload-app`) as a backend service
- **Package Manager**: `pnpm` with `pnpm-workspace.yaml`
- **Workspace Layout**:
  - root/
    - apps/
      - edwardnafornita-com/ # Main Next.js website
      - payload-cms/ # New (to be added) Payload CMS instance
    - k8s/
    - nx.json
    - package.json
    - tsconfig.base.json
    - pnpm-lock.yaml
    - pnpm-workspace.yaml


---

## 📦 Goal of This Restructure

1. **Embed Payload CMS into the Nx monorepo** under `apps/payload-cms`.
2. **Ensure interoperability** between Next.js and Payload CMS for content-driven pages (e.g., blog, resume, projects).
3. **Support production deployment** via GitHub Actions → Docker → ArgoCD → K3s cluster.
4. **Enable staging deployments** under `*.internal.edwardnafornita.com` via Cloudflare Tunnel.
5. **Make Payload CMS reusable across future apps**, e.g., via API or GraphQL.

---

## 🚀 Deployment Workflow Overview

- **GitHub Actions** (CI/CD):
- Reusable workflows handle: build, dockerization, testing, tagging, ArgoCD sync
- Production pushes (`main` branch) are gated with manual approvals
- Every app creates its own Kubernetes namespace and ingress

- **Docker**:
- All apps are containerized
- Uses multi-stage builds for optimized image size
- Payload CMS Dockerfile should be modeled after the [official Docker guide](https://payloadcms.com/docs/production/deployment#docker)

- **Infrastructure**:
- Hosted on **K3s** (lightweight Kubernetes)
- **Traefik** as ingress controller
- **Cert-Manager** for TLS (Let's Encrypt)
- **Cloudflare Tunnel** for public-facing traffic
- **Authentik** for OIDC authentication
- **PostgreSQL** as the shared database (`192.168.50.93`)
- Internal DNS served by BIND9 for `*.internal.edwardnafornita.com`

---

## 🧠 What Claude Needs to Know About Payload CMS Integration

### ✅ Key Objectives

- Relocate Payload CMS from root/edwardnafornita-com and relocate into `apps/payload-cms/`
- Adjust paths, `tsconfig.json`, and workspace references accordingly
- Replace default `server.ts` with one aligned to existing Nx monorepo conventions
- Reuse existing `.env` that is within the root/edwardnafornita-com project
- **NOTE:** the root/edwardnafornita-com project was created using `pnpm create-payload-app@latest`
- Output API routes under `/api/admin`, `/api/graphql`, and media uploads under `/media`
- Future-proof the setup for optional headless/REST/GraphQL access

### ⚙️ Required Changes

- Add Payload CMS to `pnpm-workspace.yaml`
- Add `apps/payload-cms/project.json` (Nx project definition)
- Sync `.env`, `payload.config.ts`, and database schema
- Create a dedicated Dockerfile (or adapt from [Payload Dockerfile docs](https://payloadcms.com/docs/production/deployment#docker))
- Expose CMS backend via ingress route:
  - www.edwardnafornita.com/admin # this should be the route for the dashboard and should be locked down to only allow internal ip addresses to route to it
- Modify GitHub Actions to add:
- Build step for Payload CMS
- Staging + production deploy targets
- ArgoCD sync for `payload-cms`

---

## 📡 Endpoint Strategy

| Environment | Domain                               | Ingress Path     | Notes                                  |
|-------------|--------------------------------------|------------------|----------------------------------------|
| Staging     | `payload.internal.edwardnafornita.com` | `/admin`, `/api` | Accessible via Cloudflare Tunnel only |
| Production  | `cms.edwardnafornita.com`            | `/admin`, `/api` | Requires TLS via Cert-Manager         |

---

## 🔒 Authentication & Security

- Future plan: Authentik OIDC integration for `/admin`
- Protected route middleware for specific CMS actions (resume builder, game server toggle)
- Cloudflare Tunnel adds an extra layer of protection for internal-only routes

---

## 📄 Content Types & Pages

| Collection  | Usage in Website                        |
|-------------|------------------------------------------|
| `projects`  | Portfolio showcase                       |
| `resume`    | Structured JSON resume + PDF generation  |

---

## 🔁 Resources for AI Refactoring

- [Payload CMS Documentation](https://payloadcms.com/docs/)
- [Payload CMS + Next.js Guide](https://payloadcms.com/docs/getting-started/nextjs)
- [Nx Plugin Custom Configuration](https://nx.dev/concepts/project-configuration)
- [Monorepo Patterns](https://nx.dev/concepts/monorepos)
- [GitHub Actions Reusable Workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)

---

## 📌 Claude's Primary Tasks

1. **Restructure**: Move Payload CMS scaffold into `apps/payload-cms`
2. **Configure Nx**: Ensure project.json, TypeScript config, and workspace links are added
3. **Update CI/CD**: Append `payload-cms` to GitHub Actions + ArgoCD pipeline
4. **Dockerize**: Ensure compatible Dockerfile exists under `apps/payload-cms/Dockerfile`
5. **Ingress**: Generate `payload-cms` ingress Kubernetes manifest (internal + prod)
6. **Validate**: Endpoint `/admin` should return Payload CMS panel after staging deploy
