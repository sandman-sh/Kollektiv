# Kollektiv — Open Multiplayer UI Canvas

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?logo=vite)](https://vitejs.dev/)
[![Backend: Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tests: TestSprite](https://img.shields.io/badge/Verified%20with-TestSprite-FF5722)](https://github.com/TestSprite/testsprite-cli)

**Kollektiv** is a real-time, open-source multiplayer canvas designed for designers and developers. It allows teams to collaboratively build, fork, and merge UI components in real-time on a dynamic global canvas. Think GitHub, but for visual component building with live cursors and fluid, instant updates.

🔗 **GitHub Repository**: [https://github.com/sandman-sh/Kollektiv.git](https://github.com/sandman-sh/Kollektiv.git)
⚡ **Live App**: [https://0xkollektiv.vercel.app/](https://0xkollektiv.vercel.app/)

---

## 🚀 Key Features

*   **Live Cursors & Presence**: Real-time cursor tracking and user presence powered by Supabase Realtime. See exactly where your team is working.
*   **Fork & Remix**: Instantly clone components, tweak styles, and experiment with changes in isolated sandbox layers.
*   **Merge Changes**: Git-like visual merging allowing you to merge component modifications back into the main canvas.
*   **Shader Blocks**: Incorporate high-performance WebGL shaders directly into your UI blocks.
*   **Lucide Icon Integration**: Curated library of icons for building versatile components.
*   **Supabase Edge Functions**: Lean serverless backend running Hono and Deno to securely persist canvas patches and manage identities.

---

## 🛠️ Tech Stack

*   **Frontend**: React (v18), Vite, Tailwind CSS, Lucide React, Motion.
*   **Backend & Database**: Supabase Postgres (JSONB key-value store), Supabase Edge Functions, Hono.
*   **Verification & CI**: TestSprite CLI (automated end-to-end browser tests).

---

## ⚙️ Local Development

### Prerequisites
*   Node.js (>= 20.x)
*   `pnpm` package manager

### Getting Started

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/sandman-sh/Kollektiv.git
    cd Kollektiv
    ```

2.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

3.  **Run Development Server**:
    ```bash
    pnpm dev
    ```
    Your local app will start at `http://localhost:5173`.

---

## ☁️ Backend Architecture (Supabase)

The project leverages a serverless database backend:
*   **Database Table (`kv_store_0de39c1e`)**: Stores JSONB canvas patches and hashed PIN credentials.
*   **Edge Function (`make-server-0de39c1e`) Hono Endpoint**: Handles API requests to save/load/delete patches and verify PIN identities.

---

## 🧪 E2E Verification with TestSprite

We use the [TestSprite CLI](https://github.com/TestSprite/testsprite-cli) for autonomous E2E testing against the live production environment.

### Setup TestSprite
```bash
# 1. Install CLI
npm i -g @testsprite/testsprite-cli

# 2. Authenticate
testsprite setup --api-key <YOUR_TESTSPRITE_API_KEY> --agent antigravity
```

### Running Tests
To verify changes against the live application:
```bash
testsprite test run --all --project <projectId> --wait
```

---

## 📄 License

This project is open-source and licensed under the **Apache-2.0 License**. See the LICENSE file for details.
