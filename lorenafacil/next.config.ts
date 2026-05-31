import type { NextConfig } from "next";

const isAndroidExport = process.env.CAPACITOR_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  devIndicators: false,
  ...(isAndroidExport
    ? {
        images: {
          unoptimized: true,
        },
        output: "export" as const,
        trailingSlash: true,
      }
    : {}),
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
