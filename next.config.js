/* global module, process */
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};

module.exports = nextConfig;
