import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireUser(req, res);
  if (!auth) {
    return; // requireUser handles the response
  }

  // TODO: Implement the actual logic for starting the generation job.
  // For now, just acknowledge the request.

  res.status(202).json({ message: "Analysis generation started." });
}
