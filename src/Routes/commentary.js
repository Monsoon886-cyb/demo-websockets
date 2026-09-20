import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { commentary } from "../db/schema.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";
import { db } from "../db/db.js";
import { Result } from "pg";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

commentaryRouter.get("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid Params",
      details: parsedParams.error.issues,
    });
  }

  const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid Query",
      details: parsedQuery.error.issues,
    });
  }

  const limit = Math.min(parsedQuery.data.limit ?? 100, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, parsedParams.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    console.log(err.message, err);
    res.status(500).json({
      status: "error",
      message: "Failed to list commentary",
    });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid Params",
      details: parsedParams.error.issues,
    });
  }

  const parsedBody = createCommentarySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid Payload",
      details: parsedBody.error.issues,
    });
  }

  try {
    const [event] = await db
      .insert(commentary)
      .values({
        ...parsedBody.data,
        matchId: parsedParams.data.id,
      })
      .returning();

    if (res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(event.matchId, event);
    } //only broadcast to the users who subscribed to that match

    res.status(201).json({
      status: "success",
      data: event,
    });
  } catch (err) {
    console.log(err.message, err);
    res.status(500).json({
      status: "error",
      message: "Unable to create commentary",
    });
  }
});
