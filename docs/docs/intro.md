---
sidebar_position: 1
---

# Introduction

## Vision: Open Source as The Great Online Game

We're building the reputation layer for open source development. Inspired by RuneScape's skill system, every commit earns XP, every review levels up your skills, and your contributions become your permanent digital identity.

## The Problem

Open source creates extraordinary value - [Harvard research shows $1 invested in OSS generates $2,000 of value](https://www.hbs.edu/ris/Publication%20Files/24-038_51f8444f-502c-4139-8bf2-56eb4b65c58a.pdf#page=31.22) for companies, totaling $8.8 trillion. Contributors generate thousands of dollars in value for every dollar invested, yet receive almost nothing in return:

- **Massive value, minimal compensation**: OSS supports core infrastructure across industries, yet the vast majority of maintainers receive little to no financial support.
- **Critical context scattered**: Information is spread across GitHub, Discord, and Twitter, making it impossible to track.
- **Expertise is invisible**: It's difficult to see who actually knows what in massive projects.
- **No portable reputation**: Contributors build value across projects, but recognition is siloed with no way to track long-term impact.

We're changing that by creating digital status symbols that can't be bought, only earned. Your profile becomes your developer resume, your reputation proof, and your achievement showcase - all generated from actual contributions.

## Our Solution

A powerful analytics pipeline that transforms GitHub activity into living developer profiles. Inspired by MMORPG progression systems, we track expertise across three dimensions:

- **Roles**: What type of contributor you are (maintainer, architect, feature developer).
- **Focus Areas**: Which parts of the codebase you work on (docs, core, UI, infrastructure).
- **Skills**: The technologies you demonstrate proficiency in (TypeScript, APIs, databases).

Every merged PR containing documentation changes increases your docs XP. Work on core architecture? Your architect role levels up. The more you contribute to specific areas, the higher your expertise becomes - making it clear who knows what in any project.

## The Tech Stack

- **Data Pipeline**: Automated GitHub ingestion processing thousands of events daily.
- **AI Intelligence**: OpenRouter-powered summaries surfacing signal from noise.
- **Scoring Engine**: RuneScape-inspired XP calculations tracking expertise across codebases.
- **Storage**: SQLite database with version-controlled diffable dumps.
- **Deployment**: GitHub Actions → Static Site with lightning-fast performance.

The entire system is open source, from ingestion to visualization.

## Ready to see your true level?

- **Explore**: [elizaos.github.io](https://elizaos.github.io)
- **Contribute**: [github.com/elizaos/eliza](https://github.com/elizaos/eliza)

_The game has already begun. Time to claim your place on the leaderboard._
