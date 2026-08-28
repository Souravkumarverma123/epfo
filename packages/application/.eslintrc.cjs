/** @type {import("eslint").Linter.Config} */
const config = {
  extends: ["@repo/eslint-config/node.js"],
  rules: {
    // Application orchestrates; it must not become a transport layer
    // (PRD §10: "API → Application", never the reverse).
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@repo/trpc", "@repo/trpc/*", "express", "react", "react-dom", "next", "next/*"],
            message:
              "packages/application must stay framework-free. tRPC/Express code belongs in apps/api or packages/trpc.",
          },
        ],
      },
    ],
  },
};

module.exports = config;
