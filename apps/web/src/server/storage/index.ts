import { custom } from "@better-upload/server/clients";

// Self-hosted on Supabase Storage's S3-compatible endpoint. Upstream hard-codes
// the Cloudflare R2 client; `custom()` is the same signer against any S3 host.
//   STORAGE_S3_HOST e.g. "<project-ref>.storage.supabase.co/storage/v1/s3"
export const s3Client = custom({
  host: process.env.STORAGE_S3_HOST!,
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  region: process.env.STORAGE_REGION ?? "us-east-1",
  forcePathStyle: true,
});
