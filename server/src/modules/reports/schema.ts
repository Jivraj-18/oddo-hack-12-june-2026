import { z } from "zod";

export const reportTypeEnum = z.enum(["environmental", "social", "governance", "esg-summary"]);

export const reportFilterSchema = z.object({
  department: z.string().uuid("Select a valid department.").optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  module: reportTypeEnum.optional(),
  employee: z.string().uuid("Select a valid employee.").optional(),
  challenge: z.string().uuid("Select a valid challenge.").optional(),
  category: z.string().uuid("Select a valid category.").optional(),
});

export const customReportSchema = reportFilterSchema.extend({
  format: z.enum(["pdf", "excel", "csv"]),
  reportType: reportTypeEnum.default("esg-summary"),
});
