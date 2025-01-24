import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  env: {
    SHOPIFY_SHOP_NAME: process.env.SHOPIFY_SHOP_NAME,
    SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,
  },
};

export default nextConfig;
