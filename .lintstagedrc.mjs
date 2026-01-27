import path from "path";

const buildEslintCommand = (filenames) =>
  `eslint --fix ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(" ")}`;

const config = {
  "*.{js,jsx,ts,tsx}": ["prettier --write", buildEslintCommand],
  "*.{json,css,md}": ["prettier --write"],
};

export default config;
