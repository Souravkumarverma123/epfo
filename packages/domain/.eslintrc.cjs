/** @type {import("eslint").Linter.Config} */
const config = {
  extends: ["@repo/eslint-config/node.js"],
  rules: {
    // STRUCTURAL GUARD (PRD §10): domain code must never depend on the
    // database, the transport layer, or a framework. package.json already
    // omits @repo/database as a dependency (pnpm won't resolve it), and this
    // rule turns an attempted import into a lint error with a clear message
    // instead of a confusing "module not found".
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@repo/database",
              "@repo/database/*",
              "@repo/trpc",
              "@repo/trpc/*",
              "express",
              "react",
              "react-dom",
              "next",
              "next/*",
            ],
            message:
              "packages/domain must stay pure: no database, no transport layer, no framework. Put orchestration in @repo/application instead.",
          },
        ],
      },
    ],
  },
};

module.exports = config;
