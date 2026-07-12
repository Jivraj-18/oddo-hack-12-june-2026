import { z } from "zod";

export const createChallengeSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  categoryId: z.string().uuid("Select a valid category."),
  description: z.string().min(5, "Description must be at least 5 characters."),
  xp: z.coerce.number().int().positive("XP must be a positive number."),
  difficulty: z.enum(["easy", "medium", "hard"]),
  evidenceRequired: z.boolean().default(false),
  deadline: z.coerce.date().refine((d) => d.getTime() > Date.now(), "Deadline must be a future date."),
});

export const challengeStatusEnum = z.enum(["draft", "active", "under_review", "completed", "archived"]);

export const updateChallengeStatusSchema = z.object({ status: challengeStatusEnum });

export const joinChallengeSchema = z.object({
  proofFilePath: z.string().optional(),
});

export const updateChallengeProgressSchema = z.object({
  progressPct: z.coerce.number().min(0, "Progress cannot be negative.").max(100, "Progress cannot exceed 100%."),
  proofFilePath: z.string().optional(),
});
