import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const url = `${backendUrl}/api/mentions/mark-all-read`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Cookie: request.headers.get("cookie") || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Frontend API: Backend error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to mark all mentions as read" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Frontend API: Error marking all mentions as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
