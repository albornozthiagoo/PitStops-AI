/** @type {import('next').NextConfig} */
require("dns").setDefaultResultOrder("ipv4first");
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
