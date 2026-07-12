import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createPolicySchema,
  createAuditSchema,
  createComplianceIssueSchema,
  updateComplianceIssueSchema,
} from "./schema.js";
import * as governanceService from "./service.js";

export const governanceRouter = Router();

governanceRouter.use(requireAuth);

governanceRouter.get("/policies", async (_req, res) => {
  res.json(await governanceService.listPolicies());
});

governanceRouter.post("/policies", requireRole("admin"), validateBody(createPolicySchema), async (req, res) => {
  const policy = await governanceService.createPolicy(req.body);
  res.status(201).json(policy);
});

governanceRouter.post("/policies/:id/acknowledge", async (req, res) => {
  const ack = await governanceService.acknowledgePolicy(req.params.id, req.user!.id);
  res.status(201).json(ack);
});

governanceRouter.get("/audits", async (_req, res) => {
  res.json(await governanceService.listAudits());
});

governanceRouter.post("/audits", requireRole("admin", "manager"), validateBody(createAuditSchema), async (req, res) => {
  const audit = await governanceService.createAudit(req.body);
  res.status(201).json(audit);
});

governanceRouter.post(
  "/audits/:id/issues",
  requireRole("admin", "manager"),
  validateBody(createComplianceIssueSchema),
  async (req, res) => {
    const issue = await governanceService.createComplianceIssue(req.params.id, req.body);
    res.status(201).json(issue);
  }
);

governanceRouter.get("/compliance-issues", async (_req, res) => {
  res.json(await governanceService.listComplianceIssues());
});

governanceRouter.patch(
  "/compliance-issues/:id",
  requireRole("admin", "manager"),
  validateBody(updateComplianceIssueSchema),
  async (req, res) => {
    const issue = await governanceService.updateComplianceIssueStatus(req.params.id, req.body.status);
    res.json(issue);
  }
);
