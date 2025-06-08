import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

type FeatureItem = {
  title: string;
  // Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: React.JSX.Element;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Getting Started",
    // Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>Get your local environment set up and ready to run the pipeline.</>
    ),
    link: "/docs/getting-started/installation",
  },
  {
    title: "Core Concepts",
    // Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>Learn about the architecture, data pipeline, and scoring system.</>
    ),
    link: "/docs/core-concepts/architecture",
  },
  {
    title: "API Reference",
    // Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Explore the generated API documentation for the project&apos;s functions
        and types.
      </>
    ),
    link: "/docs/api/modules",
  },
];

function Feature({ title, description, link }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--md" to={link}>
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            View The Docs
          </Link>
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
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
