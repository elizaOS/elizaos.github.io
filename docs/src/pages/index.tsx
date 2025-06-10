import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";

import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";

import styles from "./index.module.css";
import { StatCard, SkillCard } from "../components/BorrowedComponents";

type FeatureItem = {
  title: string;
  icon: string;
  description: React.JSX.Element;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: "🏆 Live Leaderboard",
    icon: "🏆",
    description: (
      <>
        View real-time rankings of contributors across ElizaOS projects. See
        who&apos;s leading in different expertise areas and track your own
        progress.
      </>
    ),
    link: "https://elizaos.github.io",
  },
  {
    title: "📊 XP & Skills System",
    icon: "📊",
    description: (
      <>
        Every PR, review, and contribution earns XP in specific areas. Level up
        your expertise in roles, focus areas, and technologies.
      </>
    ),
    link: "/docs/core-concepts/scoring-and-reputation",
  },
  {
    title: "🤖 AI-Powered Insights",
    icon: "🤖",
    description: (
      <>
        Get intelligent summaries of your contributions and impact. AI analyzes
        your work patterns and generates personalized insights.
      </>
    ),
    link: "/docs/core-concepts/ai-summaries",
  },
  {
    title: "⚡ Real-time Updates",
    icon: "⚡",
    description: (
      <>
        Your profile updates instantly with every GitHub activity. No delays, no
        manual syncing - just live reflection of your work.
      </>
    ),
    link: "/docs/getting-started/installation",
  },
  {
    title: "🔧 Open Source Pipeline",
    icon: "🔧",
    description: (
      <>
        Complete transparency with fully open-source data processing. Inspect,
        contribute to, or fork the entire analytics pipeline.
      </>
    ),
    link: "/docs/api/modules",
  },
  {
    title: "🎯 Portable Reputation",
    icon: "🎯",
    description: (
      <>
        Build reputation that follows you across projects. Your expertise
        becomes a permanent part of your developer identity.
      </>
    ),
    link: "/docs/intro",
  },
];

function Feature({ title, icon, description, link }: FeatureItem) {
  return (
    <div className={clsx("col col--4", styles.feature)}>
      <div className="card padding--lg">
        <div className="text--center">
          <div className={styles.featureIcon}>{icon}</div>
          <h3>{title}</h3>
          <p>{description}</p>
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--sm"
              to={link}
              target={link.startsWith("http") ? "_blank" : undefined}
            >
              {link.startsWith("http") ? "View Live" : "Learn More"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsPreview() {
  return (
    <section className={styles.statsSection}>
      <div className="container">
        <div className="row">
          <div className="col col--12">
            <div className="text--center margin-bottom--lg">
              <h2>🎮 How It Works</h2>
              <p className="hero__subtitle">
                Transform your development activity into meaningful progress
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col col--3">
            <StatCard
              title="Track Contributions"
              icon={<span>📊</span>}
              modalTitle="Contribution Analysis"
              modalDescription="Every commit, PR, and review matters"
              modalContent={
                <div className="padding--lg">
                  <p>We analyze all your development activities:</p>
                  <ul>
                    <li>
                      🔹 <strong>Commits:</strong> Code quality and frequency
                    </li>
                    <li>
                      🔹 <strong>Pull Requests:</strong> Feature complexity and
                      impact
                    </li>
                    <li>
                      🔹 <strong>Code Reviews:</strong> Knowledge sharing and
                      mentorship
                    </li>
                    <li>
                      🔹 <strong>Issue Resolution:</strong> Problem-solving
                      skills
                    </li>
                    <li>
                      🔹 <strong>Documentation:</strong> Knowledge transfer
                    </li>
                  </ul>
                  <p>
                    Your entire development story becomes part of your
                    reputation.
                  </p>
                </div>
              }
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "700",
                  color: "var(--ifm-color-primary)",
                  marginBottom: "0.5rem",
                }}
              >
                📈
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--ifm-color-emphasis-600)",
                }}
              >
                Real-time analysis
              </div>
            </StatCard>
          </div>
          <div className="col col--3">
            <StatCard
              title="Earn Experience"
              icon={<span>⚡</span>}
              modalTitle="XP & Skill System"
              modalDescription="Level up your expertise across multiple domains"
              modalContent={
                <div className="padding--lg">
                  <h3>XP Breakdown:</h3>
                  <ul>
                    <li>
                      <strong>Pull Requests:</strong> 50-500 XP based on
                      complexity
                    </li>
                    <li>
                      <strong>Code Reviews:</strong> 25-100 XP per thorough
                      review
                    </li>
                    <li>
                      <strong>Issue Resolution:</strong> 10-200 XP based on
                      difficulty
                    </li>
                    <li>
                      <strong>Documentation:</strong> 20-150 XP for quality docs
                    </li>
                    <li>
                      <strong>Community Help:</strong> 5-50 XP for helping
                      others
                    </li>
                  </ul>
                  <p>
                    XP accumulates across skill categories, building a
                    comprehensive developer profile.
                  </p>
                </div>
              }
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "700",
                  color: "var(--ifm-color-primary)",
                  marginBottom: "0.5rem",
                }}
              >
                🎯
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--ifm-color-emphasis-600)",
                }}
              >
                Skill-based progression
              </div>
            </StatCard>
          </div>
          <div className="col col--3">
            <StatCard
              title="Build Reputation"
              icon={<span>🏆</span>}
              modalTitle="Leaderboard & Rankings"
              modalDescription="Compete and collaborate with fellow developers"
              modalContent={
                <div className="padding--lg">
                  <p>Your reputation grows through:</p>
                  <ul>
                    <li>
                      🥇 <strong>Global Rankings:</strong> Compare with all
                      contributors
                    </li>
                    <li>
                      📊 <strong>Skill Leaderboards:</strong> Excel in your
                      specialties
                    </li>
                    <li>
                      🔥 <strong>Streak Tracking:</strong> Consistency rewards
                    </li>
                    <li>
                      🏅 <strong>Achievement Badges:</strong> Milestone
                      recognition
                    </li>
                    <li>
                      📈 <strong>Progress Tracking:</strong> Watch your growth
                      over time
                    </li>
                  </ul>
                  <p>
                    Build a portable reputation that showcases your true impact.
                  </p>
                </div>
              }
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "700",
                  color: "var(--ifm-color-primary)",
                  marginBottom: "0.5rem",
                }}
              >
                🚀
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--ifm-color-emphasis-600)",
                }}
              >
                Portable identity
              </div>
            </StatCard>
          </div>
          <div className="col col--3">
            <StatCard
              title="Discover Talent"
              icon={<span>🔍</span>}
              modalTitle="Developer Discovery"
              modalDescription="Find and showcase expertise"
              modalContent={
                <div className="padding--lg">
                  <p>Perfect for:</p>
                  <ul>
                    <li>
                      🎯 <strong>Recruiters:</strong> Find proven developers
                      with real metrics
                    </li>
                    <li>
                      🤝 <strong>Project Leads:</strong> Identify specialists
                      for your needs
                    </li>
                    <li>
                      🌟 <strong>Contributors:</strong> Showcase your expertise
                      publicly
                    </li>
                    <li>
                      📚 <strong>Mentors:</strong> Track student progress and
                      growth
                    </li>
                    <li>
                      🏢 <strong>Organizations:</strong> Recognize top
                      contributors
                    </li>
                  </ul>
                  <p>Turn your open source work into career opportunities.</p>
                </div>
              }
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "700",
                  color: "var(--ifm-color-primary)",
                  marginBottom: "0.5rem",
                }}
              >
                💼
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--ifm-color-emphasis-600)",
                }}
              >
                Career building
              </div>
            </StatCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className={styles.ctaSection}>
      <div className="container">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <div className="card padding--xl text--center">
              <h2>Ready to Level Up? 🚀</h2>
              <p className="hero__subtitle">
                Transform your open source contributions into a comprehensive
                developer profile. Every line of code tells your story.
              </p>
              <div className={styles.ctaButtons}>
                <Link
                  className="button button--primary button--lg margin--sm"
                  to="https://elizaos.github.io"
                  target="_blank"
                >
                  🏆 View Leaderboard
                </Link>
                <Link
                  className="button button--secondary button--lg margin--sm"
                  to="https://github.com/elizaos/eliza"
                  target="_blank"
                >
                  💻 Start Contributing
                </Link>
                <Link
                  className="button button--outline button--lg margin--sm"
                  to="/docs/intro"
                >
                  📖 Read the Docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageHeader() {
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <h1 className="hero__title">ElizaOS HiScores 🏆</h1>
          <p className="hero__subtitle">Open Source as The Great Online Game</p>
          <p className={styles.heroDescription}>
            Level up your developer reputation with every contribution. Track
            XP, climb leaderboards, and build portable expertise that follows
            you across projects. RuneScape meets GitHub.
          </p>

          <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="https://elizaos.github.io"
              target="_blank"
            >
              🎮 Enter the Game
            </Link>
            <Link
              className="button button--outline button--lg margin-left--sm"
              to="/docs/intro"
            >
              📚 Learn How It Works
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function HomepageFeatures(): React.JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--12">
            <div className="text--center margin-bottom--lg">
              <h2>Why ElizaOS HiScores? 🎯</h2>
              <p className="hero__subtitle">
                Turn your GitHub contributions into a permanent digital identity
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Component showcasing skill progression UI
function ShowcaseSection(): React.JSX.Element {
  return (
    <section className={styles.showcaseSection}>
      <div className="container">
        <div className="row">
          <div className="col col--12">
            <div className="text--center margin-bottom--lg">
              <h2>Interactive Skill System 🎯</h2>
              <p className="hero__subtitle">
                Experience the gamified progression that makes development
                addictive
              </p>
            </div>
          </div>
        </div>

        {/* Skills Preview - Example progression paths */}
        <div className="row margin-bottom--lg">
          <div className="col col--12">
            <h3 className="text--center margin-bottom--md">
              Example Skill Progression Paths
            </h3>
            <p
              className="text--center margin-bottom--lg"
              style={{ color: "var(--ifm-color-emphasis-600)" }}
            >
              Each skill tracks your real contributions and grows with your
              expertise
            </p>
          </div>
          <div className="col col--3">
            <SkillCard
              tagName="TypeScript Expert"
              level={1}
              score={0}
              progress={0}
              pointsToNext={100}
            />
          </div>
          <div className="col col--3">
            <SkillCard
              tagName="Code Reviewer"
              level={5}
              score={850}
              progress={0.6}
              pointsToNext={150}
            />
          </div>
          <div className="col col--3">
            <SkillCard
              tagName="Bug Squasher"
              level={12}
              score={2400}
              progress={0.8}
              pointsToNext={100}
              rank={1}
            />
          </div>
          <div className="col col--3">
            <SkillCard
              tagName="Documentation Hero"
              level={8}
              score={1200}
              progress={0.3}
              pointsToNext={300}
              rank={3}
            />
          </div>
        </div>

        {/* Call to action */}
        <div className="row">
          <div className="col col--8 col--offset-2">
            <div className="card padding--lg text--center">
              <h3>Ready to Start Your Journey? 🚀</h3>
              <p>
                Every commit you make, every PR you review, every bug you fix -
                it all counts towards your developer reputation. Start building
                your permanent record of expertise today.
              </p>

              <div className="margin-top--lg">
                <Link
                  className="button button--primary button--lg margin--sm"
                  to="https://elizaos.github.io"
                  target="_blank"
                >
                  🎮 View Live Dashboard
                </Link>
                <Link
                  className="button button--secondary button--lg margin--sm"
                  to="https://github.com/elizaos/eliza"
                  target="_blank"
                >
                  💻 Start Contributing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <Layout>
      <Head>
        <title>ElizaOS HiScores - Open Source as The Great Online Game</title>
        <meta
          name="description"
          content="Level up your developer reputation. Track XP, climb leaderboards, and build portable expertise with every GitHub contribution."
        />
      </Head>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <StatsPreview />
        <ShowcaseSection />
        <CTASection />
      </main>
    </Layout>
  );
}
