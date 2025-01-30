// next.config.mjs
// next.config.js
module.exports = {
  env: {
    OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};


/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@argent/tma-wallet'],
    webpack: (config) => {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false
      };
      return config;
    },
  }
  
  export default nextConfig;