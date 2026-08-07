import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "www.apple.com" },
      { protocol: "https", hostname: "dlcdnwebimgs.asus.com" },
      // Acer's Magento CDN — every photo the Acer scraper keeps lives under
      // /media/catalog/product/ on this host.
      { protocol: "https", hostname: "static-ecapac.acer.com" },
      // YouTube channel avatars (review channels) — resolve_channel_from_url
      // returns yt3.ggpht.com; googleusercontent is the occasional alt host.
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
