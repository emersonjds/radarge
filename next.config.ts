import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  // The dev overlay button floats over the bottom-left of every page, which lands
  // on top of the content in each e2e evidence capture.
  devIndicators: false,
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
