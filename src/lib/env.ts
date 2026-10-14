import { z } from "zod";

/**
 * Environment contract.
 *
 * Only `NEXT_PUBLIC_*` values may be read in client code; everything else is
 * server-only and must never be imported into a client component. Every value
 * is referenced statically below so Next.js can inline the public ones.
 *
 * Set `SKIP_ENV_VALIDATION=true` for a build that intentionally runs without a
 * configured backend (CI type-checks, container image builds).
 */
const publicSchema = z.object({
  /** Base URL of the Fellowa NestJS API, no trailing slash. */
  NEXT_PUBLIC_API_BASE_URL: z.string().min(1),
  /** Public origin of this app, used for absolute URLs and metadata. */
  NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),
});

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const raw = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
};

function load() {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return raw as unknown as z.infer<typeof publicSchema> &
      z.infer<typeof serverSchema>;
  }

  const result = publicSchema.merge(serverSchema).safeParse(raw);

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(
      `Invalid environment configuration (${missing}). Copy .env.example to .env.local and fill it in.`,
    );
  }

  return result.data;
}

export const env = load();
