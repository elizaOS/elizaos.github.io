import path from "path";

export default {
  resolve: {
    alias: {
      "@main": path.resolve(__dirname, "../src"),
      "@main-components": path.resolve(__dirname, "../src/components"),
      "@main-lib": path.resolve(__dirname, "../src/lib"),
      "@main-hooks": path.resolve(__dirname, "../src/hooks"),
    },
  },
};
