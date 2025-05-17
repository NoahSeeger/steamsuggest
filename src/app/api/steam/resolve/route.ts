import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    // First try to resolve the vanity URL
    const vanityResponse = await fetch(
      `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${process.env.STEAM_API_KEY}&vanityurl=${username}`,
      { cache: "force-cache", next: { revalidate: 300 } } // Cache for 5 minutes
    );
    const vanityData = await vanityResponse.json();

    if (vanityResponse.ok && vanityData.response?.success === 1) {
      return NextResponse.json({ steamId: vanityData.response.steamid });
    }

    // If vanity URL resolution fails, try to find by profile URL
    const profileResponse = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${username}`,
      { cache: "force-cache", next: { revalidate: 300 } }
    );
    const profileData = await profileResponse.json();

    if (profileResponse.ok && profileData.response?.players?.[0]) {
      return NextResponse.json({
        steamId: profileData.response.players[0].steamid,
      });
    }

    return NextResponse.json(
      { error: "Could not resolve username to Steam ID" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error resolving Steam username:", error);
    return NextResponse.json(
      { error: "Failed to resolve Steam username" },
      { status: 500 }
    );
  }
}
