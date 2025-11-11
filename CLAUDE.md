# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application called "Apartment Temperature" built with:
- React 19.2.0
- TypeScript 5
- Tailwind CSS v4 (using @tailwindcss/postcss)
- Next.js App Router architecture

## Development Commands

```bash
# Start development server (with hot reload at http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Project Structure

- `app/` - Next.js App Router directory containing all routes and layouts
  - `layout.tsx` - Root layout with Geist font configuration (sans and mono variants)
  - `page.tsx` - Home page route
  - `globals.css` - Global Tailwind CSS with custom theme variables

## TypeScript Configuration

- Path alias: `@/*` maps to root directory (use for imports like `@/app/...`)
- Strict mode enabled
- Target: ES2017
- Module resolution: bundler

## Styling

- Tailwind CSS v4 with inline theme configuration in [globals.css](app/globals.css)
- CSS variables for theming: `--background` and `--foreground`
- Dark mode support via `prefers-color-scheme` media query
- Custom fonts: Geist Sans and Geist Mono (loaded via next/font/google)

## ESLint Configuration

Uses Next.js recommended ESLint config with TypeScript support. Configuration is in [eslint.config.mjs](eslint.config.mjs) using the new ESLint flat config format.
