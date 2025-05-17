import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      "avatars.steamstatic.com",
      "media.steampowered.com",
      "shared.akamai.steamstatic.com",
    ],
  },
};

export default nextConfig;
