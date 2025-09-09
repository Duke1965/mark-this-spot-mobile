Purpose

This document is the single source of truth for working on the PINIT app with AI coding assistants (Cursor, ChatGPT, etc.).
It defines the project structure, workflow, and assistant rules to ensure clean, consistent contributions.

Project Overview

Framework: Next.js (App Router)

Language: TypeScript

Styling: Tailwind CSS

Package Manager: pnpm (npm also works)

Deployment: Vercel (auto-builds on GitHub pushes)

Repo: mark-this-spot-mobile

Folder Structure

app/ → Route-driven pages and layouts (layout.tsx, page.tsx, etc.)

components/ → Reusable UI components

hooks/ → Custom React hooks

lib/ → Utilities, API clients, business logic

public/ → Static assets (images, icons, etc.)

styles/ → Global CSS and Tailwind styles

Other important files:

package.json, pnpm-lock.yaml → dependencies and scripts

next.config.mjs → Next.js config

tailwind.config.js, postcss.config.mjs → Tailwind & PostCSS

tsconfig.json → TypeScript setup

.env.local → environment variables (ignored by Git)

Workflow

Edit locally in Cursor

Always open the clean repo folder (e.g., pinit-clean).

Only modify existing files unless explicitly asked to create new ones.

After code suggestions, always list file paths.

Commit changes via GitHub (browser)

Upload changed files via Add file → Upload files.

Make changes on a feature branch, not main.

Open a Pull Request from the feature branch into main.

Deployment

Vercel automatically builds Preview deployments for Pull Requests.

Merging into main triggers production deployment.

Rules for AI Assistants

Always read this file before writing code.

Respect the existing folder structure.

Suggest incremental edits (not full rewrites).

Provide file paths with every code snippet.

Do not invent new folders or files unless explicitly asked.

Assume Vercel handles deployment — no local server setup required.

Safety & Rollback

GitHub tags mark stable commits (e.g., v-pinit-2025-08-20, v-pinit-2025-08-25-stable).

If something breaks, restore via:

GitHub → Releases (create a branch from a tag and merge), or

Vercel → Deployments (promote a previous successful deployment).

main is protected: changes only enter via Pull Requests.