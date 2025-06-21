import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";
import path from "path";

const config: Config = {
  title: "ElizaOS",
  tagline: "Open Source as The Great Online Game",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://elizaos.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "elizaos", // Usually your GitHub org/user name.
  projectName: "elizaos.github.io", // Usually your repo name.
  trailingSlash: false,
  deploymentBranch: "_data",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          sidebarCollapsed: false,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/elizaos/elizaos.github.io/tree/main/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      },
    ],
  ],

  plugins: [
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: [
          "../src/lib/pipelines/**/*.ts",
          "../src/lib/data/schema.ts",
        ],
        tsconfig: "../tsconfig.json",
        out: "api",
        sidebar: {},
      },
    ],
    function (_context, _options) {
      return {
        name: "webpack-configuration-plugin",
        configureWebpack(_config, _isServer, _utils) {
          return {
            resolve: {
              alias: {
                "@main": path.resolve(__dirname, "../src"),
                "@main-components": path.resolve(
                  __dirname,
                  "../src/components",
                ),
                "@main-lib": path.resolve(__dirname, "../src/lib"),
                "@main-hooks": path.resolve(__dirname, "../src/hooks"),
              },
            },
          };
        },
      };
    },
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/docusaurus-social-card.jpg",
    navbar: {
      title: "ElizaOS HiScores",
      items: [
        {
          type: "doc",
          docId: "intro",
          position: "left",
          label: "Docs",
        },
        {
          type: "doc",
          docId: "api/modules",
          position: "left",
          label: "API",
        },
        {
          href: "/docs/demo",
          label: "Demo",
          position: "left",
        },
        {
          href: "https://elizaos.github.io/",
          label: "Site",
          position: "right",
        },
        {
          href: "https://github.com/elizaos/elizaos.github.io",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Introduction",
              to: "/docs/intro",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Twitter",
              href: "https://twitter.com/elizaos",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/elizaos/elizaos.github.io",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ElizaOS. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
    },
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  },
};

export default config;
