import type { NextConfig } from "next";

type NextConfigWithTracing = NextConfig & {
  experimental?: NextConfig["experimental"] & {
    outputFileTracingIncludes?: Record<string, Array<string>>;
  };
};

const nextConfig: NextConfigWithTracing = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/(.*)": ["../json/**"],
    },
  },
};

export default nextConfig;
