<div align="center">

<img src="public/echo-logo.png" alt="Echo" width="120" />

# Echo

**A real-time communication platform for communities.**

Servers, channels, voice & video, direct messages, and moderation — in one fast, modern web app.

[![CI](https://github.com/d-e-v-14/echo/actions/workflows/ci.yml/badge.svg)](https://github.com/d-e-v-14/echo/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-see%20EULA-lightgrey)](#license)

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Architecture](#-architecture) · [Scripts](#-scripts) · [Contributing](#-contributing)

</div>

---

## About

**Echo** is a Discord-style collaboration platform built by **IEEE Computer Society VIT**. It brings server-based communities, real-time text and voice communication, and a full moderation toolset together in a single Next.js application.

Everything runs in the browser with an App Router–based frontend talking to a REST + WebSocket backend, authenticated through Supabase and secured with a strict Content Security Policy.

> **Status:** actively developed. Interfaces and APIs may change before a stable release.

---

## Features

### 💬 Messaging
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

### 🔊 Voice & Video
- Low-latency voice channels via **Amazon Chime SDK**
- Video calls with camera and screen-share controls
- Minimized call bar and floating call window
- Voice channel presence, invites, and notifications

### 🏛️ Servers & Channels
- Create and join servers with custom branding
- Text and voice channels
- Role-based permissions and self-assignable roles
- Server settings and member management
- Shareable invite links and invite codes

### 👥 Social
- Friend requests, friends list, and presence
- User profiles with avatars and customization
- Profile settings and account management

### 🛡️ Moderation & Safety
- Report user flows with moderation queue
- Kick/ban and member controls
- Audit-oriented action handling
- Strict CSP, secure cookie sessions, and route guards
- Legal surface: Terms of Service, Privacy Policy, EULA, and Community Guidelines

### ✨ Experience
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
| Tooling | ESLint, Prettier, Docker |

---

## Getting Started

### Prerequisites

- **Node.js** 18.18+ (20 LTS recommended) and **npm** 10+
- Optional: **Docker** and **Docker Compose**
- Access to an Echo API instance (REST + Socket.IO) and a Supabase project

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

Create a `.env` file in the project root:

```dotenv
# Backend REST + Socket.IO base URL
NEXT_PUBLIC_API_URL=http://localhost:5000/

# Supabase (auth)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Amazon Chime voice/video API
NEXT_PUBLIC_CHIME_API_URL=your-chime-api-url
```

> `.env` is git-ignored — never commit real credentials.

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
│   ├── (legal)/          # Terms, Privacy, EULA, Community Guidelines
│   └── layout.tsx        # Root providers + metadata
├── api/                  # Typed API clients (auth, channels, messages, servers, …)
├── components/           # UI: chat, voice/video, moderation, navigation, toast
├── contexts/             # React contexts (voice call, notifications, toasts, unread)
├── hooks/                # Reusable hooks incl. TanStack Query wrappers
├── lib/                  # Domain logic: auth, socket, moderation, media, navigation
└── content/              # Markdown legal documents
```

The frontend is organized by **feature/domain** rather than by file type: each folder under `src/lib` owns a slice of behavior (auth, channels, messages, dm, friendship, moderation, media, mentions, servers, socket, security), and components compose those slices into screens.

**Session model:** authentication is cookie-based. Supabase handles identity; the app exchanges sessions with the backend and keeps them fresh through `TokenRefreshProvider`. Route guard components (`RouteGuard`, `GuestGuard`) enforce access at the layout boundary.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run the Vitest test suite |

---

## Docker

### Development

```bash
docker compose up
```

The app is served at [http://localhost:3000](http://localhost:3000).

### Production

The production image uses a multi-stage build and Next.js standalone output:

```bash
docker build -f Dockerfile.production -t echo .
docker run -p 3000:3000 echo
```

---

## Continuous Integration

Every push and pull request to `main`, `master`, `develop`, or `gravitas` runs the pipeline in [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. Install dependencies (`npm ci`)
2. Type check (`tsc --noEmit`)
3. Lint (ESLint)
4. Test (Vitest)
5. Build (`next build`)

---

## Contributing

1. Create a branch: `git checkout -b feat/your-feature`
2. Make your changes and keep them focused
3. Run the checks locally:
   ```bash
   npm run typecheck && npm run lint && npm test
   ```
4. Commit with a clear message (conventional commits welcome) and open a pull request

Please keep changes consistent with the existing feature/domain structure and Tailwind styling conventions.

---

## License

Echo is developed by **IEEE Computer Society VIT**. Use of the platform and source is governed by the project's [End User License Agreement](src/content/legal/eula.md) and [Terms of Service](src/content/legal/terms-of-service.md).

<div align="center">

Built with ❤️ by IEEE Computer Society VIT

</div>
