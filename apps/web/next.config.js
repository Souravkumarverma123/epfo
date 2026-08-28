/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output = a self-contained server bundle with only the
  // production deps it actually needs, traced from the build. This is what
  // keeps the Docker image lean instead of shipping the whole monorepo's
  // node_modules.
  output: "standalone",
};

export default nextConfig;
