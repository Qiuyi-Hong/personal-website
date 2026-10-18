import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("GET /api/contributions", () => {
  it("responds 200 with an empty list", async () => {
    const res = await request(createApp()).get("/api/contributions");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("unknown /api paths", () => {
  it("respond 404", async () => {
    const res = await request(createApp()).get("/api/stars");

    expect(res.status).toBe(404);
  });
});
