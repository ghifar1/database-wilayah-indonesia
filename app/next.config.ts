import type { NextConfig } from "next";

type NextConfigWithTracing = NextConfig & {
  outputFileTracingIncludes?: Record<string, Array<string>>;
};

const nextConfig: NextConfigWithTracing = {
  outputFileTracingIncludes: {
    "/api/(.*)": ["../data/**"],
  },
};

export default nextConfig;
