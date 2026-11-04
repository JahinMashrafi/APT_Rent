const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.js", "**/*.test.cjs", "**/*.test.mjs"],
    exclude: ["node_modules/**"],
  },
});
