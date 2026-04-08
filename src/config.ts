import { homedir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: join(homedir(), ".yt", ".env"), override: false });

const envSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.1-pro-preview"),
  LOG_LEVEL: z.string().trim().min(1).default("info"),
  YOUTUBE_API_KEY: z.string().trim().min(1).optional(),
  YT_DATA_DIR: z.string().trim().min(1).optional()
});

export type AppConfig = {
  dataDir: string;
  databasePath: string;
  geminiApiKey: string | undefined;
  geminiModel: string;
  logLevel: string;
  youtubeApiKey: string | undefined;
};

export const loadConfig = (): AppConfig => {
  const env = envSchema.parse(process.env);
  const dataDir = env.YT_DATA_DIR ?? join(homedir(), ".yt");

  return {
    dataDir,
    databasePath: join(dataDir, "yt.sqlite"),
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL,
    logLevel: env.LOG_LEVEL,
    youtubeApiKey: env.YOUTUBE_API_KEY
  };
};
