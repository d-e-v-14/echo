import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const url = `${backendUrl}/api/mentions/search/${serverId}?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Frontend API: Backend error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch mentions from backend" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Frontend API: Error in mentions search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
