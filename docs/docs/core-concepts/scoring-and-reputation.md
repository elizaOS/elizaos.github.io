---
sidebar_position: 1
---

# Scoring & Reputation

A core goal of this project is to create a rich, nuanced reputation system that goes beyond simple contribution counts. We've drawn inspiration from the progression systems in MMORPGs like RuneScape to make tracking your open source journey more engaging and rewarding.

## The Three Dimensions of Expertise

Our system analyzes GitHub activity to track expertise across three key dimensions. Every time you contribute, you gain experience points (XP) that level up your skills and make your expertise visible.

### 1. Roles

This dimension reflects your high-level contribution patterns and your function within the community.

- **Maintainer**: Merging PRs, managing issues, and steering the project.
- **Architect**: Making significant changes to the core structure and logic.
- **Feature Developer**: Implementing new features and functionality.
- **Docs Writer**: Creating, updating, and improving documentation.

### 2. Focus Areas

This represents the specific parts of the codebase you work on. It helps show where your knowledge is concentrated.

- **Core**: The central application logic.
- **UI**: User interface components and styling.
- **API**: The application's public or private APIs.
- **Infra**: Deployment, CI/CD, and other infrastructure-related code.
- **Docs**: The documentation, guides, and other written materials.
- **Tests**: Unit, integration, and end-to-end tests.

### 3. Skills

This dimension tracks your proficiency with specific technologies and languages, as demonstrated by your code.

- **TypeScript**
- **React**
- **Next.js**
- **Databases**
- **APIs**

## How It Works: Earning XP

The scoring engine processes every merged pull request. It analyzes the files changed and assigns XP to the relevant Focus Areas and Skills based on a sophisticated pattern matching system defined in `config/pipeline.config.ts`.

For example:

- If you edit a file in the `src/app/` directory, you might gain `UI` XP.
- If your changes involve `drizzle.config.ts`, you'll earn `Database` XP.
- If you contribute a new component to `src/components/`, you'll get `React` and `TypeScript` XP.

This system ensures that your profile is a living resume that accurately reflects your proven expertise and your journey within the open source world.

## Planned Scoring Enhancements

To make scoring even more nuanced and to better reward high-impact work, the following enhancements are planned for the scoring algorithm.

### 1. Reaction-Based Scoring

The system will award points for positive reactions (👍, ❤️, 🎉) received on PR descriptions, issue descriptions, and comments. This captures community appreciation and agreement, which is a strong indicator of a valuable contribution.

### 2. PR Impact Modifiers

Several new factors will be introduced to better gauge the impact of a pull request:

- **Issue Linkage Bonus**: PRs that directly address and close an issue will receive bonus points, with higher bonuses for fixing bugs or implementing planned features.
- **Code Area Weighting**: Changes made to critical areas of the codebase (e.g., `core`, `infra`) will receive a higher score multiplier, recognizing the greater impact of modifying foundational code.
- **Trivial PR Mitigation**: A penalty will be applied to very small PRs (e.g., < 10 lines changed) to discourage "micr-commits" aimed at gaming the system, unless the PR addresses a critical bug.
- **PR Label Multipliers**: Specific labels (like "high-impact" or "security") can be configured to apply a score multiplier, allowing maintainers to manually flag and reward important contributions.

### 3. Review Depth Bonus

To encourage more thorough code reviews, a small bonus will be awarded if a review contains a minimum number of distinct comment threads (e.g., 3 or more), rewarding interaction and detailed feedback over a single long comment.
