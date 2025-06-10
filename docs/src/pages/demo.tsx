import React from "react";
import Layout from "@theme/Layout";
import {
  StatCard,
  Badge,
  SkillCard,
  LeaderboardEntry,
} from "../components/BorrowedComponents";

export default function Demo(): React.JSX.Element {
  return (
    <Layout>
      <main style={{ padding: "2rem 0" }}>
        <div className="container">
          {/* Hero Section */}
          <section style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h1>🎮 ElizaOS HiScores Demo</h1>
            <p
              style={{
                fontSize: "1.2rem",
                color: "var(--ifm-color-emphasis-600)",
              }}
            >
              Interactive preview of components borrowed from the main app
            </p>
          </section>

          {/* Stats Overview */}
          <section style={{ marginBottom: "3rem" }}>
            <h2>📊 Stats Overview</h2>
            <div className="row">
              <div className="col col--3">
                <StatCard
                  title="Total XP"
                  value="12,547"
                  change="+234 this week"
                  trend="up"
                  icon="⭐"
                />
              </div>
              <div className="col col--3">
                <StatCard
                  title="Global Rank"
                  value="#42"
                  change="↑ 5 positions"
                  trend="up"
                  icon="🏆"
                />
              </div>
              <div className="col col--3">
                <StatCard
                  title="PRs Merged"
                  value="28"
                  change="+3 this month"
                  trend="up"
                  icon="🔀"
                />
              </div>
              <div className="col col--3">
                <StatCard
                  title="Contributions"
                  value="156"
                  change="All time"
                  trend="neutral"
                  icon="💻"
                />
              </div>
            </div>
          </section>

          {/* Skills Section */}
          <section style={{ marginBottom: "3rem" }}>
            <h2>⚡ Skills & Expertise</h2>
            <div className="row">
              <div className="col col--4">
                <SkillCard
                  skill="TypeScript"
                  level={15}
                  xp={4520}
                  description="Advanced TypeScript development with strong type system knowledge"
                />
              </div>
              <div className="col col--4">
                <SkillCard
                  skill="React"
                  level={12}
                  xp={3240}
                  description="Component architecture and modern React patterns"
                />
              </div>
              <div className="col col--4">
                <SkillCard
                  skill="API Design"
                  level={8}
                  xp={1890}
                  description="RESTful and GraphQL API development"
                />
              </div>
            </div>
          </section>

          {/* Badges Section */}
          <section style={{ marginBottom: "3rem" }}>
            <h2>🏅 Achievement Badges</h2>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              <Badge variant="success">Core Contributor</Badge>
              <Badge variant="warning">Architecture Expert</Badge>
              <Badge variant="default">TypeScript Master</Badge>
              <Badge variant="secondary">Documentation Writer</Badge>
              <Badge variant="danger">Bug Hunter</Badge>
            </div>
            <p style={{ color: "var(--ifm-color-emphasis-600)" }}>
              Badges are earned through consistent contributions and expertise
              demonstration
            </p>
          </section>

          {/* Mini Leaderboard */}
          <section style={{ marginBottom: "3rem" }}>
            <h2>🏆 Top Contributors Preview</h2>
            <div style={{ maxWidth: "600px" }}>
              <LeaderboardEntry
                rank={1}
                username="codewizard"
                score={25840}
                avatar="https://avatars.githubusercontent.com/u/1?v=4"
                badges={["Legend", "Core", "TypeScript"]}
              />
              <LeaderboardEntry
                rank={2}
                username="devmaster"
                score={22150}
                avatar="https://avatars.githubusercontent.com/u/2?v=4"
                badges={["Expert", "React", "API"]}
              />
              <LeaderboardEntry
                rank={3}
                username="codeartist"
                score={19320}
                avatar="https://avatars.githubusercontent.com/u/3?v=4"
                badges={["Designer", "UI/UX"]}
              />
              <LeaderboardEntry
                rank={4}
                username="bugslayer"
                score={17890}
                badges={["Hunter", "QA", "Testing"]}
              />
              <LeaderboardEntry
                rank={5}
                username="docwriter"
                score={15640}
                badges={["Writer", "Docs"]}
              />
            </div>
          </section>

          {/* Interactive Elements */}
          <section style={{ marginBottom: "3rem" }}>
            <div className="card padding--lg" style={{ textAlign: "center" }}>
              <h2>🚀 Ready to Join?</h2>
              <p>
                These components are pulled directly from the main ElizaOS
                HiScores app, giving you a real preview of what to expect.
              </p>
              <div style={{ marginTop: "1rem" }}>
                <a
                  href="https://elizaos.github.io"
                  className="button button--primary button--lg margin--sm"
                  target="_blank"
                >
                  View Live Leaderboard
                </a>
                <a
                  href="https://github.com/elizaos/eliza"
                  className="button button--secondary button--lg margin--sm"
                  target="_blank"
                >
                  Start Contributing
                </a>
              </div>
            </div>
          </section>

          {/* Technical Notes */}
          <section>
            <div
              className="card padding--lg"
              style={{ backgroundColor: "var(--ifm-color-secondary)" }}
            >
              <h3>🔧 Technical Implementation</h3>
              <p>These components demonstrate how you can:</p>
              <ul>
                <li>
                  <strong>Borrow UI Components</strong> - Adapt React components
                  from your main app
                </li>
                <li>
                  <strong>Maintain Consistency</strong> - Keep the same visual
                  language across docs and app
                </li>
                <li>
                  <strong>Share Design System</strong> - Reuse badges, cards,
                  and interactive elements
                </li>
                <li>
                  <strong>Live Data Integration</strong> - Eventually connect to
                  real API endpoints
                </li>
              </ul>
              <p>
                <Badge variant="secondary">React</Badge>{" "}
                <Badge variant="secondary">TypeScript</Badge>{" "}
                <Badge variant="secondary">Docusaurus</Badge>{" "}
                <Badge variant="secondary">Shared Components</Badge>
              </p>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
