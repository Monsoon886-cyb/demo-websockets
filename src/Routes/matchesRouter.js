import { Router } from "express";
import { matches } from "../db/schema.js";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid Query",
      details: parsed.error.issues,
    });
  }
  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Failed to list matches",
    });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid Payload",
      details: parsed.error.issues,
    });
  }
  const {
    data: { startTime, endTime, homeScore, awayScore },
  } = parsed;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();

    res.status(201).json({
      status: "success",
      data: event,
    });
  } catch (err) {
    res.status(500).json({
      err,
    });
  }
});
