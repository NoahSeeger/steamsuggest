import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const steamId = searchParams.get("steamId");

  if (!steamId) {
    return NextResponse.json(
      { error: "Steam ID is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${steamId}`,
      { cache: "force-cache", next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!response.ok) {
      throw new Error("Failed to fetch wishlist");
    }

    const data = await response.json();

    // Transform the data into a more usable format
    const wishlist = data.response.items.map((item: any) => ({
      appid: item.appid,
      priority: item.priority,
      date_added: new Date(item.date_added * 1000).toLocaleDateString(),
    }));

    return NextResponse.json({ wishlist });
  } catch (error) {
    console.error("Steam API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}
