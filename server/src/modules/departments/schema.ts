import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  code: z.string().min(2, "Code must be at least 2 characters."),
  headUserId: z.string().uuid("Select a valid head of department.").optional(),
  parentDepartmentId: z.string().uuid("Select a valid parent department.").optional(),
});
