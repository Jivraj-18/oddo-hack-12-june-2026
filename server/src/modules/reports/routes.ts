import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import { reportFilterSchema, customReportSchema, reportTypeEnum } from "./schema.js";
import { buildReport } from "./service.js";
import { streamReportAsPdf, streamReportAsExcel, streamReportAsCsv } from "./export.js";
import { AppError } from "../../middleware/error-handler.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get("/reports/:type", validateQuery(reportFilterSchema), async (req, res) => {
  const parsed = reportTypeEnum.safeParse(req.params.type);
  if (!parsed.success) {
    throw new AppError(422, "invalid_report_type", "Unknown report type.");
  }
  const report = await buildReport(parsed.data, req.query as any);
  res.json(report);
});

reportsRouter.post("/reports/custom", async (req, res) => {
  const input = customReportSchema.parse(req.body);
  const report = await buildReport(input.reportType, input);

  if (input.format === "pdf") return streamReportAsPdf(res, report);
  if (input.format === "excel") return streamReportAsExcel(res, report);
  return streamReportAsCsv(res, report);
});
