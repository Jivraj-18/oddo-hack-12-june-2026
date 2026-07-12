import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Entered email is invalid."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  departmentId: z.string().uuid("Select a valid department.").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Entered email is invalid."),
  password: z.string().min(1, "Password is required."),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required."),
});
