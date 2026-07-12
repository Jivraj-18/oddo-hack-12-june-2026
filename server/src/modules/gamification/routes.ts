import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createChallengeSchema,
  updateChallengeStatusSchema,
  joinChallengeSchema,
} from "./schema.js";
import * as gamificationService from "./service.js";

export const gamificationRouter = Router();

gamificationRouter.use(requireAuth);

gamificationRouter.get("/challenges", async (_req, res) => {
  res.json(await gamificationService.listChallenges());
});

gamificationRouter.post("/challenges", requireRole("admin", "manager"), validateBody(createChallengeSchema), async (req, res) => {
  const challenge = await gamificationService.createChallenge(req.body);
  res.status(201).json(challenge);
});

gamificationRouter.patch(
  "/challenges/:id/status",
  requireRole("admin", "manager"),
  validateBody(updateChallengeStatusSchema),
  async (req, res) => {
    const challenge = await gamificationService.updateChallengeStatus(req.params.id, req.body.status);
    res.json(challenge);
  }
);

gamificationRouter.post("/challenges/:id/join", validateBody(joinChallengeSchema), async (req, res) => {
  const participation = await gamificationService.joinChallenge(req.user!.id, req.params.id, req.body.proofFilePath);
  res.status(201).json(participation);
});

gamificationRouter.patch("/challenge-participations/:id/approve", requireRole("admin", "manager"), async (req, res) => {
  const participation = await gamificationService.completeChallengeParticipation(req.params.id, "approved");
  res.json(participation);
});

gamificationRouter.patch("/challenge-participations/:id/reject", requireRole("admin", "manager"), async (req, res) => {
  const participation = await gamificationService.completeChallengeParticipation(req.params.id, "rejected");
  res.json(participation);
});

gamificationRouter.get("/badges", async (req, res) => {
  res.json(await gamificationService.listBadges(req.user!.id));
});

gamificationRouter.get("/rewards", async (_req, res) => {
  res.json(await gamificationService.listRewards());
});

gamificationRouter.post("/rewards/:id/redeem", async (req, res) => {
  const redemption = await gamificationService.redeemReward(req.user!.id, req.params.id);
  res.status(201).json(redemption);
});

gamificationRouter.get("/leaderboard", async (req, res) => {
  const scope = req.query.scope === "department" ? "department" : "user";
  res.json(await gamificationService.getLeaderboard(scope));
});
