import { z } from "zod";

export const esgConfigSchema = z
  .object({
    autoEmissionCalc: z.boolean(),
    evidenceRequiredGlobal: z.boolean(),
    badgeAutoAward: z.boolean(),
    emailAlerts: z.boolean(),
    weightEnv: z.coerce.number().min(0).max(1),
    weightSocial: z.coerce.number().min(0).max(1),
    weightGov: z.coerce.number().min(0).max(1),
  })
  .refine((data) => Math.abs(data.weightEnv + data.weightSocial + data.weightGov - 1) < 0.001, {
    message: "Score weights must total 100%.",
    path: ["weightEnv"],
  });
