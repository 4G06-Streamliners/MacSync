import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/ticket-sales",
        destination: "/signups",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
