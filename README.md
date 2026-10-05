<div align="center">

<img src="public/echo-logo.png" alt="Echo" width="128" />



Servers, channels, voice & video, direct messages, and moderation in one fast, modern web app.

**Built for [IEEE Computer Society, VIT](https://ieeecsvit.com)** · [echo.ieeecsvit.com](https://echo.ieeecsvit.com)

<br />

[![CI](https://github.com/d-e-v-14/echo/actions/workflows/ci.yml/badge.svg)](https://github.com/d-e-v-14/echo/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

[Overview](#overview) · [Features](#features) · [Tech Stack](#tech-stack) · [Quick Start](#quick-start) · [Architecture](#architecture) · [Configuration](#configuration) · [Deployment](#deployment) · [Contributing](#contributing)

</div>

---

## Overview

**Echo** is a Discord-style collaboration platform built for **IEEE Computer Society, VIT**. It unites server-based communities, real-time text and voice communication, and a complete moderation toolset in a single, fast Next.js application. It powers the IEEE CS VIT student community at [echo.ieeecsvit.com](https://echo.ieeecsvit.com), and the codebase is maintained as an open project.

The product is a browser-first frontend: an App Router–based Next.js app that talks to a REST + WebSocket backend, authenticates users through Supabase, and is hardened with a strict Content Security Policy, cookie-based sessions, and route-level guards.

> **Project status:** actively developed for the IEEE CS VIT community. Interfaces and APIs may change before a stable release.

### Why Echo

- **Real-time by default**: messages, typing indicators, presence, and calls stay in sync over Socket.IO.
- **Community-native**: servers, channels, roles, invites, and moderation are first-class, not bolt-ons.
- **Secure**: strict CSP, HttpOnly sessions, guarded routes, and no secrets in the client bundle.
- **Production-ready**: typed API layer, CI on every change, containerized builds, and standalone output.

---

## Features

### Messaging
- Real-time text channels powered by **Socket.IO**
- Direct messages and group conversations
- Message editing, deletion, replies, and pinned messages
- Typing indicators with live presence
- `@mentions` with unread tracking and mention highlighting
- Full-text message search
- Virtualized message lists (`react-virtuoso`) for large histories
- Markdown rendering with GitHub-flavored markdown
- File attachments rendered as downloadable cards with inline image/video previews
- YouTube link previews

### Voice & Video
- Low-latency voice channels via the **Amazon Chime SDK**
- Video calls with camera and screen-share controls
- Minimized call bar and floating call window
- Voice channel presence, invites, and notifications

### Servers & Channels
- Create and join servers with custom branding
- Text and voice channels
- Role-based permissions and self-assignable roles
- Server settings and member management
- Shareable invite links and invite codes

### Social
- Friend requests, friends list, and presence
- User profiles with avatars and customization
- Profile settings and account management

### Moderation & Safety
- Report user flows with a moderation queue
- Kick/ban and member controls
- Audit-oriented action handling
- Strict CSP, secure cookie sessions, and route guards

### Experience
- Responsive, dark-themed UI built with Tailwind CSS
- Animated landing and transitions (GSAP / AOS)
- Emoji picker, GIF picker (Giphy), and reactions
- Toast notifications and error boundaries
- Google Analytics / Tag Manager integration

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 14](https://nextjs.org) (App Router, standalone output) |
| UI | [React 18](https://react.dev), [Tailwind CSS 3](https://tailwindcss.com) |
| Language | [TypeScript 5](https://www.typescriptlang.org) |
| Data fetching | [TanStack Query 5](https://tanstack.com/query), [Axios](https://axios-http.com) |
| Realtime | [Socket.IO client](https://socket.io) |
| Voice / Video | [Amazon Chime SDK](https://aws.amazon.com/chime/chime-sdk/) |
| Auth | [Supabase](https://supabase.com) (email + OAuth) |
| Content | [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm |
| Media | [Giphy](https://giphy.com), [emoji-mart](https://github.com/missive/emoji-mart) |
| Animation | [GSAP](https://gsap.com), [AOS](https://michalsnik.github.io/aos/) |
| Testing | [Vitest](https://vitest.dev) |
| Tooling | ESLint, Prettier, Docker, GitHub Actions |

---

## Quick Start

### Prerequisites

| Requirement | Version |
| --- | --- |
| Node.js | 18.18+ (20 LTS recommended) |
| npm | 10+ |
| Docker | optional, for containerized runs |
| Echo API | REST + Socket.IO backend endpoint |
| Supabase | project URL + anon key |

### 1. Clone

```bash
git clone https://github.com/d-e-v-14/echo.git
cd echo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the template and fill in your values (see [Configuration](#configuration)):

```bash
cp .env.example .env
```

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_CHIME_API_URL=your-chime-api-url
```

> `.env` is git-ignored. Never commit real credentials.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Sign up, login, OAuth callback, password reset
│   ├── (app)/            # Authenticated app: messages, servers, friends, profile
│   └── layout.tsx        # Root providers + metadata
├── api/                  # Typed API clients (auth, channels, messages, servers, …)
├── components/           # UI: chat, voice/video, moderation, navigation, toast
├── contexts/             # React contexts (voice call, notifications, toasts, unread)
├── hooks/                # Reusable hooks incl. TanStack Query wrappers
└── lib/                  # Domain logic: auth, socket, moderation, media, navigation
```

The frontend is organized by **feature/domain** rather than by file type. Each folder under `src/lib` owns a slice of behavior (`auth`, `channels`, `messages`, `dm`, `friendship`, `moderation`, `media`, `mentions`, `servers`, `socket`, `security`), and components compose those slices into screens.

### Key design decisions

| Concern | Approach |
| --- | --- |
| **Sessions** | Cookie-based auth. Supabase handles identity; the app exchanges sessions with the backend and keeps them fresh via `TokenRefreshProvider`. |
| **Route protection** | `RouteGuard` and `GuestGuard` enforce access at the layout boundary rather than per-page checks. |
| **Data fetching** | TanStack Query owns server cache state; Axios clients in `src/api` are the single transport layer. |
| **Realtime** | A single `SocketProvider` multiplexes app events (messages, presence, typing, voice). |
| **Voice/Video** | `CallStateManager` + `VoiceVideoManager` wrap the Amazon Chime SDK and expose call state through React context. |
| **Security** | A strict CSP is injected for every route from `next.config.js`; secrets stay server-side. |
| **Rendering** | App Router with route groups and streaming; production uses Next.js `standalone` output. |

---

## Configuration

All variables are read at build time. `NEXT_PUBLIC_*` values are exposed to the browser by design; never place private secrets in a `NEXT_PUBLIC_*` variable.

| Variable | Required | Exposed | Description |
| --- | :---: | :---: | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Browser | Base URL of the Echo REST + Socket.IO backend. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser | Supabase project URL used for authentication. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser | Supabase anon/public key (safe to expose; protected by Row Level Security). |
| `NEXT_PUBLIC_CHIME_API_URL` | Yes | Browser | Endpoint that issues Amazon Chime meeting and attendee credentials. |
| `NEXT_PUBLIC_GIPHY_API_KEY` | No | Browser | Giphy API key for the GIF picker. |
| `NEXT_PUBLIC_SOCKET_PATH` | No | Browser | Custom Socket.IO path if the backend does not use the default. |
| `NEXT_PUBLIC_SOCKET_WITH_CREDENTIALS` | No | Browser | Set to send credentialed requests on the Socket.IO connection. |
| `NEXT_PUBLIC_APK_URL` | No | Browser | Android APK download URL shown on the landing page. |

A ready-to-fill template is provided in [`.env.example`](.env.example). Real environment files (`.env`, `.env.*`) are git-ignored; only `.env.example` is tracked.

### Environment presets

| Environment | `NEXT_PUBLIC_API_URL` |
| --- | --- |
| Local development | `http://localhost:5000/` |
| Production | `https://echo-api.ieeecsvit.com/` |

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run the Vitest test suite |

---

## Testing

Echo uses [Vitest](https://vitest.dev) for unit tests. Tests live alongside the code they cover (for example `src/lib/scrollUtils.test.ts`).

```bash
npm test          # run once
npx vitest        # watch mode
npx vitest --ui   # interactive UI
```

Run the full local gate before opening a pull request:

```bash
npm run typecheck && npm run lint && npm test
```

---

## Docker

### Development

```bash
docker compose up
```

The app is served at [http://localhost:3000](http://localhost:3000).

### Production

The production image is a multi-stage build that compiles the app and ships the Next.js standalone server as a non-root user:

```bash
docker build -f Dockerfile.production -t echo .
docker run -p 3000:3000 --env-file .env echo
```

The resulting image contains only the standalone server, static assets, and `public/`, with no source or dev dependencies.

---

## Deployment

Echo builds to Next.js [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), so it can run on essentially any Node host.

### Vercel (recommended)

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Add the environment variables from [Configuration](#configuration) for the Production and Preview environments.
3. Deploy; the detected build command is `npm run build`.

### Docker / self-hosted

```bash
docker build -f Dockerfile.production -t echo .
docker run -d --name echo -p 3000:3000 --env-file .env --restart unless-stopped echo
```

### Bare Node

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

The production server listens on `PORT` (default `3000`) and binds `HOSTNAME` (default `0.0.0.0` in the container image).

### Production checklist

- [ ] All four environment variables set for the target environment
- [ ] `NEXT_PUBLIC_API_URL` points at the production API over HTTPS
- [ ] Supabase redirect URLs include the production origin
- [ ] `npm run typecheck && npm run lint && npm test && npm run build` pass
- [ ] Health check hits `/` and completes within the platform timeout

---

## Continuous Integration

Every push and pull request to `main`, `master`, `develop`, or `gravitas` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. Install dependencies (`npm ci`)
2. Type check (`tsc --noEmit`)
3. Lint (ESLint)
4. Test (Vitest)
5. Build (`next build`)

All five steps must pass before a change is mergeable.

A second workflow, [`.github/workflows/secret-scan.yml`](.github/workflows/secret-scan.yml), runs [gitleaks](https://github.com/gitleaks/gitleaks) over the full history on every push and pull request to catch committed secrets before they land.

---

## Security

- **Content Security Policy**: a strict, environment-aware CSP is set on every route from `next.config.js`, restricting scripts, frames, workers, and connections to trusted origins.
- **Sessions**: cookie-based, refreshed automatically; no tokens persisted in `localStorage`.
- **Route guards**: `RouteGuard` / `GuestGuard` prevent unauthenticated access and redirect signed-in users away from guest routes.
- **Secrets**: only public identifiers (`NEXT_PUBLIC_*`) reach the browser; the Supabase anon key is protected by Row Level Security.
- **User content**: markdown and message content are rendered through a controlled pipeline; external embeds are limited to an allowlist.

To report a security concern, please contact the maintainers privately rather than opening a public issue.

---

## Contributing

Contributions are welcome from IEEE CS VIT members and the wider community.

1. Fork the repository and create a branch:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make focused changes and follow the existing feature/domain structure and Tailwind conventions.
3. Run the checks locally:
   ```bash
   npm run typecheck && npm run lint && npm test
   ```
4. Commit with a clear [conventional commit](https://www.conventionalcommits.org/) message, e.g. `feat(chat): render link previews`.
5. Open a pull request describing the change and linking any related issue.

---

## Maintainers

Echo is built and maintained by **IEEE Computer Society, VIT**.

- **Community / org:** [IEEE Computer Society VIT](https://ieeecsvit.com)
- **Repository:** [d-e-v-14/echo](https://github.com/d-e-v-14/echo)
- **Live app:** [echo.ieeecsvit.com](https://echo.ieeecsvit.com)

Questions, ideas, or bugs? Open an [issue](https://github.com/d-e-v-14/echo/issues) or start a discussion.

---

## Acknowledgements

Built with Next.js, React, Tailwind CSS, Supabase, Socket.IO, the Amazon Chime SDK, and the open-source community. Thanks to every IEEE CS VIT member who has contributed to Echo.

---

## License

Echo is developed for **IEEE Computer Society, VIT**. All rights reserved.

<div align="center">

Made for **IEEE Computer Society, VIT**

</div>
