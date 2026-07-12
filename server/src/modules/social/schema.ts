import { z } from "zod";

export const createCsrActivitySchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  categoryId: z.string().uuid("Select a valid category."),
  description: z.string().min(5, "Description must be at least 5 characters."),
  eventDate: z.coerce.date(),
  location: z.string().min(1, "Location is required."),
  evidenceRequired: z.boolean().default(false),
  points: z.coerce.number().int().nonnegative("Points must be zero or a positive number."),
});

export const joinCsrActivitySchema = z.object({
  proofFilePath: z.string().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  type: z.enum(["csr_activity", "challenge"]),
});

export const createDiversityMetricSchema = z.object({
  departmentId: z.string().uuid("Select a valid department."),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format."),
  genderRatio: z.object({
    male: z.coerce.number().nonnegative(),
    female: z.coerce.number().nonnegative(),
    other: z.coerce.number().nonnegative(),
  }),
  trainingCompletionPct: z.coerce.number().min(0).max(100, "Training completion must be between 0 and 100."),
});
