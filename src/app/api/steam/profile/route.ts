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
    // Fetch profile information
    const profileResponse = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`,
      { cache: "force-cache", next: { revalidate: 300 } } // Cache for 5 minutes
    );
    const profileData = await profileResponse.json();

    if (!profileResponse.ok || !profileData.response?.players?.[0]) {
      console.error("Failed to fetch profile information:", {
        status: profileResponse.status,
        body: profileData,
      });
      return NextResponse.json(
        { error: "Failed to fetch profile information" },
        { status: profileResponse.status || 500 }
      );
    }

    const player = profileData.response.players[0];
    const profile = {
      steamid: player.steamid,
      personaname: player.personaname,
      avatar: player.avatarfull,
      realname: player.realname,
      country: player.loccountrycode,
      timecreated: player.timecreated,
      lastlogoff: player.lastlogoff,
      profileurl: player.profileurl,
      personastate: player.personastate, // 0 - Offline, 1 - Online, 2 - Busy, 3 - Away, 4 - Snooze, 5 - Looking to trade, 6 - Looking to play
      gameextrainfo: player.gameextrainfo, // Current game if playing
      gameid: player.gameid, // Current game ID if playing
      primaryclanid: player.primaryclanid,
      communityvisibilitystate: player.communityvisibilitystate, // 1 - Private, 2 - Friends only, 3 - Public
      commentpermission: player.commentpermission,
      last_online: new Date(player.lastlogoff * 1000).toISOString(),
      account_created: new Date(player.timecreated * 1000).toISOString(),
      current_status: getPersonaState(player.personastate),
      current_game: player.gameextrainfo || null,
      profile_visibility: getVisibilityState(player.communityvisibilitystate),
    };

    // Fetch owned games
    const gamesResponse = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`,
      { cache: "force-cache", next: { revalidate: 300 } } // Cache for 5 minutes
    );
    const gamesData = await gamesResponse.json();

    if (!gamesResponse.ok || !gamesData.response?.games) {
      console.error("Failed to fetch owned games:", {
        status: gamesResponse.status,
        body: gamesData,
      });
      return NextResponse.json(
        { error: "Failed to fetch owned games" },
        { status: gamesResponse.status || 500 }
      );
    }

    const ownedGames = gamesData.response.games.map((game: any) => ({
      appid: game.appid,
      name: game.name,
      playtime_forever: Math.round(game.playtime_forever / 60), // Convert to hours
      img_icon_url: game.img_icon_url,
      has_community_visible_stats: game.has_community_visible_stats,
      playtime_windows_forever: Math.round(
        (game.playtime_windows_forever || 0) / 60
      ),
      playtime_mac_forever: Math.round((game.playtime_mac_forever || 0) / 60),
      playtime_linux_forever: Math.round(
        (game.playtime_linux_forever || 0) / 60
      ),
      rtime_last_played: game.rtime_last_played
        ? new Date(game.rtime_last_played * 1000).toISOString()
        : null,
    }));

    return NextResponse.json({ profile, ownedGames });
  } catch (error) {
    console.error("Error fetching Steam data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Steam data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function getPersonaState(state: number): string {
  const states = {
    0: "Offline",
    1: "Online",
    2: "Busy",
    3: "Away",
    4: "Snooze",
    5: "Looking to trade",
    6: "Looking to play",
  };
  return states[state as keyof typeof states] || "Unknown";
}

function getVisibilityState(state: number): string {
  const states = {
    1: "Private",
    2: "Friends only",
    3: "Public",
  };
  return states[state as keyof typeof states] || "Unknown";
}
