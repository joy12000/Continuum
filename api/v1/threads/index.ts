import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "@lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireUser(req, res);
  if (!auth) return;

  res.status(200).json({ message: "Threads API is working" });
}