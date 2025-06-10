---
sidebar_position: 3
---

# Frontend Guide (`/src`)

A frontend developer contributing to this system would primarily need to be familiar with the **Next.js application structure** within the `src/app/` directory and the **React components** within the `src/components/` directory, along with several utility and data access files in `src/lib/`.

Here's a breakdown of key areas and files:

## 1. Next.js Application Structure (`src/app/`)

This directory uses the **Next.js App Router** and contains the pages that render the UI. Understanding how routing works here is crucial.

- **Root Layout (`src/app/layout.tsx`)**: Defines the overall structure, including shared components like the `Navigation` and providers like `ThemeProvider` and `AuthProvider`.
- **Global Styles (`src/app/globals.css`)**: Contains the base styles, including Tailwind CSS configurations and color variables.
- **Page Files (`src/app/.../page.tsx`)**: These are the entry points for different routes. They often fetch data (in server components) and pass it to client components for rendering.
  - **Homepage (`src/app/page.tsx`)**: Currently redirects to the daily summary page (`/day`).
  - **About Page (`src/app/about/page.tsx`)**: Contains static content about the project's vision, problem, solution, and tech stack. It uses the `ProgressSection` component.
  - **Auth Callback Page (`src/app/auth/callback/page.tsx`)**: Handles the GitHub OAuth callback process using the `useAuth` hook from the context.
  - **Leaderboard Page (`src/app/leaderboard/page.tsx`)**: Fetches leaderboard data for different periods (`all`, `monthly`, `weekly`) and renders the `Leaderboard` component.
  - **Interval Summary Pages (`src/app/[interval]/[[...date]]/page.tsx`)**: Handles routes like `/day/YYYY-MM-DD` or `/month/YYYY-MM`. It fetches metrics and summaries for a specific time interval and renders components like `DateNavigation`, `StatCardsDisplay`, `SummaryContent`, `CodeChangesDisplay`, and `LlmCopyButton`.
  - **Profile Page (`src/app/profile/[username]/page.tsx`)**: Fetches a specific user's profile data (scores, tags, summaries, activity) and renders the `UserProfile` component. Includes server-side data fetching queries.
  - **Profile Edit Page (`src/app/profile/edit/page.tsx`)**: Contains components for editing a user's profile, specifically linking wallet addresses. Uses client components like `ProfileEditor`.
- **Query Files (`src/app/.../queries.ts`)**: These files contain database query logic used by Next.js server components to fetch data needed for rendering pages. This is where the frontend interacts with the data layer.

## 2. React Components (`src/components/`)

This directory houses reusable UI components used across the application.

- **Shadcn UI Components (`src/components/ui/`)**: Pre-built UI components like `Button`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Select`, `Tabs`, `Tooltip`, etc.. Familiarity with these components and how they are used is essential. Includes custom wrappers like `WalletAddressBadge` and `LlmCopyButton`.
- **Core Application Components (`src/components/`)**: Components specific to this application's features.
  - `Navigation.tsx`: The main site navigation bar.
  - `Leaderboard.tsx` and `LeaderboardCard.tsx`: Components for displaying the leaderboard list and individual entries.
  - `UserProfile.tsx`: The main component for displaying a contributor's profile.
  - `SummaryCard.tsx`: Component to display AI-generated summaries with navigation.
  - `StatCard.tsx`: A generic card component for displaying a key statistic, often with an icon and optional modal content.
  - `DailyActivity.tsx`: Component to visualize a user's daily activity using a bar chart.
  - `SkillCard.tsx`: Component to display a contributor's skill or tag level and progress.
  - `ActivityItem.tsx`, `ContributorItem.tsx`, `MetricItem.tsx`, `StatBadge.tsx`, `BadgeList.tsx`, `CounterWithIcon.tsx`: Smaller presentation components used within pages or other cards.
  - `AuthControls.tsx`: Component to handle user authentication UI (Login/Logout/Profile link).
  - Icon components (`EthereumIcon.tsx`, `SolanaIcon.tsx`).
- **Page-Specific Components (`src/app/.../components/`)**: Components used specifically within one page, such as `DateNavigation`, `IntervalSelector`, `StatCardsDisplay`, `SummaryContent`, `CodeChangesDisplay`, and the modal content components for lists. Also includes wallet linking components like `ProfileEditor`, `WalletLinkForm`, `WalletLinkBoard`, and `ProfileRepoNotice`.

## 3. Frontend Utility and Helper Files (`src/lib/`)

- `src/lib/utils.ts`: General utility functions like `cn` for conditionally combining CSS class names.
- `src/lib/date-utils.ts`: Functions for formatting and manipulating dates, used extensively for UI display.
- `src/lib/format-number.ts`: Utility for formatting large numbers concisely.
- `src/lib/skill-icons.tsx`: Maps skill names to corresponding Lucide icons for display.
- `src/lib/typeHelpers.ts`: Basic TypeScript type guards.
- `src/lib/data/db-nextjs.ts`: Provides the Drizzle ORM database instance for use in Next.js server components.
- `src/lib/data/schema.ts`: Defines the database schema. Understanding this is necessary to know what data is available and how it's structured for querying.
- `src/lib/walletLinking/`: Contains hooks (`useProfileEditor.ts`, `useProfileWallets.ts`) and utility functions (`readmeUtils.ts`, `getUserWalletAddresses.ts`) related to the wallet linking feature, which is part of the frontend profile editing functionality. `decode.ts` is used here for Base64 decoding.
- `src/lib/llm-formatter.ts`: Used by the `LlmCopyButton` to format metrics data for copying.
- `src/hooks/useCopyToClipboard.ts`: Custom hook used in the wallet linking components.

## 4. Context and Hooks (`src/contexts/`, `src/hooks/`)

- `src/contexts/AuthContext.tsx`: Provides authentication state (`user`, `token`) and functions (`signin`, `signout`, `handleAuthCallback`) via the `useAuth` hook. Crucial for any authenticated features.
- `src/hooks/useCopyToClipboard.ts`: A specific custom hook for copying text.

In summary, a frontend developer should focus heavily on the files within `src/app/` and `src/components/`, understanding how the Next.js App Router fetches data (often via queries in `src/app/.../queries.ts` and `src/lib/scoring/queries.ts`) and how the various components display this data. Familiarity with core utilities in `src/lib/` (especially date formatting, number formatting, and shared types/helpers) and state management like the `AuthContext` is also vital. While not writing pipeline code, understanding the structure of the generated data and the database schema (`src/lib/data/schema.ts`) is necessary to effectively query and display information.
