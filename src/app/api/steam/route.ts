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
      throw new Error(`Steam API returned status ${response.status}`);
    }

    const data = await response.json();

    // Check if the response has the expected structure
    if (!data.response) {
      console.error("Invalid Steam API response structure:", data);
      return NextResponse.json(
        { error: "Invalid response from Steam API" },
        { status: 500 }
      );
    }

    // Check if the user has a wishlist
    if (!data.response.items || !Array.isArray(data.response.items)) {
      // Return empty wishlist instead of error if user has no wishlist
      return NextResponse.json({ wishlist: [] });
    }

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
      {
        error: "Failed to fetch wishlist",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
