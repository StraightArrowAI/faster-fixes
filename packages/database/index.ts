import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

// Self-hosted on Supabase: the standard node-postgres adapter over Supavisor.
// Upstream branches to PrismaNeon when NODE_ENV=production, which speaks Neon's
// WebSocket protocol and cannot talk to any other Postgres host.
const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

export { prisma };
