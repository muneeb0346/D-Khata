import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "connected" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
