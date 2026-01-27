import nextPlugin from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = [
  ...nextPlugin,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_$", destructuredArrayIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
