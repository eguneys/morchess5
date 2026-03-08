import { Router } from "express";
import { db } from "./db_init.js";

import crypto from 'crypto'
import { rateLimit, RateLimitError } from "./rate_limit.js";
import { getCache, invalidateCache, setCache } from "./cache.js";
import type { UserDbId } from "./types.js";
import { getMonthsUTC, getTodaysUTC, getWeeksUTC, getYearsUTC } from "./dates.js";
import { getDefaultHighWaterMark } from "stream";
import { DEV } from "./config.js";
import { inc, metrics } from "./metrics.js";
import { run, run_category } from "./pl_worker/pl_worker.js";
import { paginate, puzzleFixture, transformList } from "./puzzles_fixture.js";


export const gen_id8 = () => Math.random().toString(16).slice(2, 10)

declare global {
  namespace Express {
    interface Request {
      user_id?: UserDbId;
    }
  }
}

class LockedDayError extends Error {}
class InvalidHashError extends Error {}



export const router = Router()

router.use(async (req, res, next) => {

  let ip = req.ip
  if (ip) {
    if (!DEV) {
      await rateLimit(ip, 'ip_fast', 15, 5)
      await rateLimit(ip, 'ip_hour', 100, 3600)
    }
  }

  let sessionId = req.cookies.morchess_session
  let userId: string | undefined

  if (sessionId) {
    const row = await db.prepare<string, { user_id: string }>(
      `SELECT user_id FROM sessions WHERE session_id = ?`,
    ).get(sessionId)

    if (row) {
      userId = row.user_id
      await db.prepare(
        `UPDATE sessions
         SET last_seen_at = datetime('now')
         WHERE session_id = ?`,
      ).run(sessionId)

    } else {
      // Stale or invalid cookie
      res.clearCookie('morchess_session')
      sessionId = undefined
    }
  }

  // Create new session if needed
  if (!sessionId) {
    sessionId = gen_id8()
    userId = gen_id8()

    await db.prepare(
      `INSERT INTO users (id, created_at)
       VALUES (?, datetime('now'))`,
    ).run(userId)

    await db.prepare(
      `INSERT INTO sessions
       (session_id, user_id, created_at, last_seen_at)
       VALUES (?, ?, datetime('now'), datetime('now'))`,
    ).run([sessionId, userId])

    res.cookie('morchess_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: !DEV,
      maxAge: 1000 * 60 * 60 * 24 * 365
    })
  }

  // Invariant satisfied
  req.user_id = userId!
  next()
})


router.get('/puzzle_list', async (req, res) => {
  if (!DEV) {
    await rateLimit(req.user_id!, 'puzzle_list_fast', 5, 15)
    await rateLimit(req.user_id!, 'puzzle_list_hour', 10, 3600)
  }

    const page = Number(req.query.page ?? 1)
    const pageSize = Math.min(100, Number(req.query.pageSize ?? 30))

    const pageData = paginate(puzzleFixture, page, pageSize)

    const transformed = pageData.items

    res.json({
      ...pageData,
      items: transformed
    })
})


router.post('/prolog_code', async (req, res) => {

  if (!DEV) {
    await rateLimit(req.user_id!, 'prolog_fast', 8, 10)
    await rateLimit(req.user_id!, 'prolog_hour', 60, 3600)
  }


    const { code, puzzle_id, list } = req.body

    if (code.length > 5000) {
        return res.status(400).json({ error: 'Code too long' })
    }
    if (list) {
      let puzzles = puzzleFixture.slice(0, 10)

      try {
        let result = await run_category(code, puzzles)
        if (!result) {
          return res.json({ error: 'category command failed.' })
        }
        let puzzle_payload = puzzles
        res.json({ categories: result, payload: puzzle_payload })
      } catch (e) {
        res.json({ error: e })
      }
    } else {

      let fen = puzzleFixture.find(_ => _.id === puzzle_id)?.fen2

      if (!fen) {
        return res.status(400).json({ error: "Puzzle not found." })
      }


      try {
        let result = await run(code, fen)
        if (!result) {
          return res.json({ error: 'command failed.' })
        }
        res.json(result)
      } catch (e) {
        res.json({ error: e })
      }
    }

})