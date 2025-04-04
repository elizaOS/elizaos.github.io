# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Overview

GitHub Contributor Analytics Generator for tracking, analyzing, and visualizing GitHub repository contributions. Features include:

- Daily, weekly, and monthly reports on repository activity
- Contributor profile pages with metrics and visualizations
- Activity tracking for PRs, issues, and commits
- Scoring system for ranking contributors
- AI-powered activity summaries

## Tech Stack

- Frontend: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- Data Processing: TypeScript pipeline with SQLite/Drizzle ORM
- Legacy Scripts: Python for data processing and AI summaries
- Automation: GitHub Actions for scheduled reports

# Commands for ElizaOS Contributor Analytics

## Build & Development

- `bun run dev` - Start development server
- `bun run build` - Build production site
- `bun run check` - Run linter and type checks
- `bun run lint` - Run ESLint only
- `bunx tsc --noEmit` - Run TypeScript checks
- `bun run serve` - Serve built site
- `bun run db:generate` - Generate database schema
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Launch Drizzle studio
- `bun run pipeline` - Run data processing pipeline
- `bun run pipeline ingest` - Ingest GitHub data
- `bun run pipeline process` - Process and analyze data

## Code Style

- Next.js 15 app router with TypeScript and Tailwind CSS
- Import order: React, libraries, local components (@/components), utils
- Component names: PascalCase, file names: kebab-case
- Use TypeScript for all files with strict typing
- Use React hooks and functional components
- Strict error handling with TypeScript's strict mode
- Use shadcn/ui component library and Lucide icons
- SQLite database with Drizzle ORM
- Follow modern Next.js patterns with server components where appropriate

## Project Structure

- `config/` - Configuration files including pipeline settings
- `src/lib/data/` - Database schema and data processing logic
- `src/lib/` - Utility and helper functions
- `src/components/` - React components for the web interface
- `scripts/` - Python scripts and TypeScript pipeline code
- `drizzle/` - Database migration files
