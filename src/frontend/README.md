# Frontend

- **mobile** – React Native app with **Expo** and **Expo Router** (file-based routing, tabs).
- **web-admin** – **Next.js** app (App Router, TypeScript, Tailwind).

## Quick start

### Mobile (Expo Router)

```bash
cd mobile
npm install
npx expo start
```

- Press **i** for iOS simulator, **a** for Android emulator, or scan the QR code with **Expo Go** on your device.
- Press **w** to open in the browser (Metro web).

**Hot reload on your phone:** For live updates when you edit code, run Expo **locally** (as above), not in Docker. Docker volume mounts often don’t forward file-change events, so Metro in a container may not see edits. Use Docker for postgres/backend/web-admin and run `npx expo start` from `frontend/mobile` for mobile dev.

### Web Admin (Next.js)

```bash
cd web-admin
npm install
npm run dev
```

- Open [http://localhost:3000](http://localhost:3000).

## Structure

```
frontend/
├── mobile/          # Expo (React Native) + Expo Router
│   ├── app/         # File-based routes
│   │   ├── _layout.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx
│   │       ├── index.tsx    # Home tab
│   │       └── explore.tsx  # Explore tab
│   ├── app.json
│   └── package.json
│
└── web-admin/       # Next.js (App Router)
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── globals.css
    ├── next.config.ts
    └── package.json
```

## Backend

The NestJS backend lives at `../backend`. Default API base: `http://localhost:3000`. Configure in each app (e.g. env) if needed.
