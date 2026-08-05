/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from "next/head";
import { useState, useEffect, useRef } from "react";

const CLIENT_ID = "a2e6aeb9971e4287a1985803be608d24";
const REDIRECT_URI = "https://www.ethanbonsall.com/birthday/spotify";
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const PLAYLIST_ID = "6yoTyxeEYmrn0GQ0rpATGv";

export default function BirthdaySubmitPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; artists: { name: string }[]; uri: string }[]
  >([]);
  const [token, setToken] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("spotifyToken");
    setAccessToken(token);
  }, []);

  useEffect(() => {
    const fetchAccessToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (!code) return;

      try {
        const response = await fetch(`/api/auth-token?code=${code}`);
        const data = await response.json();

        if (response.ok) {
          setToken(data.access_token);
          localStorage.setItem("spotifyToken", data.access_token);

          if (data.expires_in) {
            setTimeout(fetchAccessToken, (data.expires_in - 60) * 1000);
          }

          uploadStoredSongs(data.access_token);
          fetchPlaylistSongs(data.access_token);
        } else {
          console.error("Failed to fetch access token", data);
        }
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    };

    fetchAccessToken();
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchPlaylistSongs(token);
  }, [token]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleLogin = () => {
    window.location.href = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=playlist-modify-public playlist-modify-private`;
  };

  const addSongToPlaylist = async (song: { id: string; uri: string }) => {
    if (!token) return;

    if (playlistSongs.some((s) => s.uri === song.uri)) {
      console.log("Song already in playlist.");
      return;
    }

    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || accessToken}`,
        },
        body: JSON.stringify({ uris: [song.uri] }),
      }
    );

    if (response.ok) {
      setPlaylistSongs([...playlistSongs, song]);
    }
  };
  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const response = await fetch("/api/spotify-token");
        const data = await response.json();

        if (response.ok) {
          setAccessToken(data.access_token);
          localStorage.setItem("spotifyToken", data.access_token);

          if (data.expires_in) {
            setTimeout(fetchAccessToken, (data.expires_in - 60) * 1000);
          }
        } else {
          console.error("Failed to fetch access token", data);
        }
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    };

    fetchAccessToken();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    if (accessToken) {
      fetchPlaylistSongs(accessToken);
      handleSearch();
    }
  }, [token]);

  const fetchPlaylistSongs = async (userToken: string) => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlaylistSongs(data.items.map((item: any) => item.track));
        return;
      }
    } catch (error) {
      console.error("Error fetching playlist songs from Spotify:", error);
    }
    try {
      await fetch(
        "https://api.spotify.com/v1/playlists/6yoTyxeEYmrn0GQ0rpATGv/tracks",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Error fetching playlist songs from Spotify:", error);
    }
  };

  const handleSearch = async () => {
    if (!token) return;
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        searchQuery
      )}&type=track`,
      {
        headers: { Authorization: `Bearer ${accessToken || token}` },
      }
    );
    const data = await response.json();
    setSearchResults(data.tracks.items || []);
  };

  const uploadStoredSongs = async (userToken: string) => {
    try {
      const response = await fetch("https://www.ethanbonsall.com/api/songs");
      if (!response.ok) return;

      const storedSongs = await response.json();
      const uris = storedSongs
        .map((song: { uri: string }) => song.uri)
        .filter((uri: any) => uri);

      if (uris.length === 0) return;

      const spotifyResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({ uris }),
        }
      );

      if (spotifyResponse.ok) {
        await fetch("https://www.ethanbonsall.com/api/songs/delete", {
          method: "DELETE",
        });
        fetchPlaylistSongs(userToken);
      }
    } catch (error) {
      console.error("Error uploading stored songs:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white p-6 flex flex-col items-center font-mono">
      <h1 className="text-4xl font-bold mb-4 text-center bg-gray-300 text-black p-2 border-2 border-black shadow-md">
        Ethan&apos;s Birthday Rager 🎶
      </h1>
      <Head>
        <title>Birthday Music</title>
      </Head>

      {!token ? (
        <button
          onClick={handleLogin}
          className="bg-gray-300 text-black border-2 border-black px-4 py-2 shadow-md active:shadow-inner"
        >
          Login to Spotify
        </button>
      ) : (
        <>
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search for a song..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2 p-2 border-2 border-black bg-gray-100 text-black w-full max-w-md shadow-inner"
          />
          <button
            onClick={handleSearch}
            className="w-full max-w-md bg-blue-600 text-white px-4 py-2 border-2 border-black shadow-md active:shadow-inner"
          >
            Search
          </button>

          {/* Search Results (Dropdown with Scroll) */}
          <div className="relative w-full max-w-md mt-2 bg-gray-100 text-black p-2 border-2 border-black shadow-md max-h-60 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-gray-700">No results found.</p>
            ) : (
              searchResults.map((song) => (
                <div
                  key={song.id}
                  className="p-2 border-b border-black last:border-b-0 flex justify-between items-center"
                >
                  <span>
                    {song.name} - {song.artists[0].name}
                  </span>
                  {!playlistSongs.some((s) => s.uri === song.uri) && (
                    <button
                      onClick={() => addSongToPlaylist(song)}
                      className="bg-green-500 px-2 py-1 border-2 border-black shadow-md active:shadow-inner"
                    >
                      +
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Always Open Playlist */}
          <div className="w-full max-w-md mt-4 bg-gray-300 border-2 border-black p-2 shadow-md">
            <a
              href="https://open.spotify.com/playlist/6yoTyxeEYmrn0GQ0rpATGv"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="text-black text-lg font-bold mb-2 transition-colors duration-200 hover:bg-gray-200">
                📂 Playlist Songs
              </button>
            </a>

            {playlistSongs.length === 0 ? (
              <p className="text-gray-700">No songs in the playlist.</p>
            ) : (
              playlistSongs.map((song) => (
                <div
                  key={song.id}
                  className=" text-black p-2 border-b border-black last:border-b-0"
                >
                  {song.name} - {song.artists[0].name}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
