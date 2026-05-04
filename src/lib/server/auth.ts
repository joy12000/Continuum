import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "./supabase";

export async function requireUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.slice("Bearer ".length);
  const supabase = getSupabaseServer(token);
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data?.user) {
    return null;
  }
  
  return { supabase, userId: data.user.id, token };
}
