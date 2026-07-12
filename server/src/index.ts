import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { startOverdueComplianceJob } from "./jobs/overdue-compliance.js";
import { startScoringJob } from "./jobs/scoring.js";

const app = createApp();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" },
});

io.on("connection", (socket) => {
  socket.on("join", (userId: string) => socket.join(`user:${userId}`));
});

startOverdueComplianceJob(io);
startScoringJob();

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`EcoSphere API listening on port ${port}`);
});
