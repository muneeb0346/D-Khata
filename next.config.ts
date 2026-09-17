import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withSentryConfig(nextConfig);
