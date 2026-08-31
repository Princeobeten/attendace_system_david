import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Next.js does not walk up to a parent lockfile.
  turbopack: { root: projectRoot },

  // Face descriptors and base64 thumbnails make enrolment payloads larger than
  // the default Server Action limit; recognition posts stay well under it.
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
