import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "www.apple.com" },
      { protocol: "https", hostname: "dlcdnwebimgs.asus.com" },
    ],
  },
};

export default nextConfig;
