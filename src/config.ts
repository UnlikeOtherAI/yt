import { homedir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  LOG_LEVEL: z.string().trim().min(1).default("info"),
  YOUTUBE_API_KEY: z.string().trim().min(1).optional(),
  YT_DATA_DIR: z.string().trim().min(1).optional()
});

export type AppConfig = {
  dataDir: string;
  databasePath: string;
  geminiApiKey?: string;
  logLevel: string;
  youtubeApiKey?: string;
};

export const loadConfig = (): AppConfig => {
  const env = envSchema.parse(process.env);
  const dataDir = env.YT_DATA_DIR ?? join(homedir(), ".yt");

  return {
    dataDir,
    databasePath: join(dataDir, "yt.sqlite"),
    geminiApiKey: env.GEMINI_API_KEY,
    logLevel: env.LOG_LEVEL,
    youtubeApiKey: env.YOUTUBE_API_KEY
  };
};
