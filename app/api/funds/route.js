import { getFunds } from "@/lib/db-utils"; // Import your function
import { NextResponse } from "next/server";

// Named export for POST requests
export async function POST(req) {
  try {
    const body = await req.json(); // Parse JSON body
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ message: "Missing user_id in request body" }, { status: 400 });
    }

    const orders = await getFunds(user_id); // Fetch orders
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Error fetching funds:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
