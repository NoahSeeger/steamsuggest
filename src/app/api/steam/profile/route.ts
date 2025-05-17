import { NextResponse } from "next/server";
import { STEAM_API_KEY, STEAM_API_BASE_URL } from "@/config/steam";

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
    // Fetch user profile
    const profileResponse = await fetch(
      `${STEAM_API_BASE_URL}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`
    );

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch profile");
    }

    const profileData = await profileResponse.json();
    const profile = profileData.response.players[0];

    // Fetch owned games
    const gamesResponse = await fetch(
      `${STEAM_API_BASE_URL}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`
    );

    if (!gamesResponse.ok) {
      throw new Error("Failed to fetch owned games");
    }

    const gamesData = await gamesResponse.json();
    const ownedGames = gamesData.response.games || [];

    return NextResponse.json({
      profile: {
        steamid: profile.steamid,
        personaname: profile.personaname,
        avatar: profile.avatarfull,
        realname: profile.realname,
        country: profile.loccountrycode,
        timecreated: profile.timecreated,
        lastlogoff: profile.lastlogoff,
      },
      ownedGames: ownedGames.map((game: any) => ({
        appid: game.appid,
        name: game.name,
        playtime_forever: Math.round(game.playtime_forever / 60), // Convert to hours
        img_icon_url: game.img_icon_url,
        has_community_visible_stats: game.has_community_visible_stats,
      })),
    });
  } catch (error) {
    console.error("Steam API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile data" },
      { status: 500 }
    );
  }
}
