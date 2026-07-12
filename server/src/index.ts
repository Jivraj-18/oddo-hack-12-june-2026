import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { setIo } from "./realtime.js";
import { startOverdueComplianceJob } from "./jobs/overdue-compliance.js";
import { startScoringJob } from "./jobs/scoring.js";
import { startPolicyReminderJob } from "./jobs/policy-reminders.js";

const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" },
});
setIo(io);

io.on("connection", (socket) => {
  socket.on("join", (userId: string) => socket.join(`user:${userId}`));
});

startOverdueComplianceJob();
startScoringJob();
startPolicyReminderJob();

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`EcoSphere API listening on port ${port}`);
});
