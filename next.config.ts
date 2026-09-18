import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default withSentryConfig(nextConfig);
