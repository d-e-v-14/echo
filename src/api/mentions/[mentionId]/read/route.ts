import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { mentionId: string } }
) {
  try {
    const { mentionId } = params;

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const url = `${backendUrl}/api/mentions/${mentionId}/read`;

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
        { error: "Failed to mark mention as read" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Frontend API: Error marking mention as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
