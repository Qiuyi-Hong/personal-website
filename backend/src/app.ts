import express from "express";

export function createApp() {
  const app = express();

  app.get("/api/contributions", (_req, res) => {
    res.json([]);
  });

  return app;
}
