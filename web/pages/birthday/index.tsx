/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import supabase from "../../supabaseClient";
import RSVPModal from "../../components/rsvp";
import Link from "next/link";
import Head from "next/head";

export default function BirthdayPage() {
  const [, setSongs] = useState<any[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; artists: { name: string }[]; uri: string }[]
  >([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("spotifyToken");
    setAccessToken(token);
  }, []);

  const [showDropdown, setShowDropdown] = useState(false);
  const [showRSVP, setShowRSVP] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [existingSongs, setExistingSongs] = useState<Set<string>>(new Set());

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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    // Fetch songs from the API to determine which ones should not show the "+"
    const fetchExistingSongs = async () => {
      try {
        const response = await fetch("/api/songs");
        if (!response.ok) throw new Error("Failed to fetch existing songs");

        const data = await response.json();
        setExistingSongs(new Set(data.map((song: any) => song.id))); // Store song IDs in a Set
      } catch (error) {
        console.error("Error fetching existing songs:", error);
      }
    };

    fetchExistingSongs();
  }, []);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch("/api/photos/");

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid response format");
        }

        // ✅ Extract URLs properly
        setPhotos(Array.isArray(data) ? data.map((photo) => photo.url) : []);
      } catch (error) {
        console.error("Error fetching photos:", error);
        setPhotos([]); // Prevents .map() errors
      }
    };

    fetchPhotos();
  }, []);

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex(
      (prevIndex) => (prevIndex - 1 + photos.length) % photos.length
    );
  };

  const uploadPhoto = async (file: File) => {
    const filePath = `recruit/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from("photos")
      .upload(filePath, file);

    if (error) {
      console.error("Upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("photos").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const uploadedPhotos = (
      await Promise.all(
        Array.from(files).map(async (file) =>
          uploadPhoto(file).catch(() => null)
        )
      )
    ).filter((url): url is string => url !== null);

    setPhotos((prevPhotos) => [
      ...prevPhotos,
      ...uploadedPhotos.filter((url): url is string => url !== null),
    ]);
  };

  const handleSearch = async () => {
    if (accessToken === null) {
      console.error("Access token is missing");
      return;
    }

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        searchQuery
      )}&type=track`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch search results", await response.json());
      return;
    }

    const data = await response.json();
    setSearchResults(data.tracks.items || []);
    setShowDropdown(true);
  };

  const addSongToList = async (song: {
    id: any;
    name: any;
    artists: any[];
    uri: any;
  }) => {
    if (!accessToken) {
      console.error("Access token is missing");
      return;
    }

    try {
      // Fetch the current songs
      const playlistResponse = await fetch(
        "https://api.spotify.com/v1/playlists/6yoTyxeEYmrn0GQ0rpATGv/tracks",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!playlistResponse.ok) {
        console.error(
          "Failed to fetch playlist songs",
          await playlistResponse.text()
        );
        return;
      }

      const playlistData = await playlistResponse.json();
      const existingSongs = playlistData.items.map(
        (item: any) => item.track.uri
      );

      // Check if the song is already in the playlist
      if (existingSongs.includes(song.uri)) {
        console.log("Song is already in the playlist.");
        return;
      }

      // Proceed with adding the song if it's not found
      const simplifiedSong = {
        id: song.id,
        name: song.name,
        artists: song.artists.map((artist) => artist.name).join(", "),
        uri: song.uri,
      };

      setSongs((prevSongs) => [...prevSongs, simplifiedSong]);
      setExistingSongs((prev) => new Set([...prev, song.id]));

      const response = await fetch(
        "https://www.ethanbonsall.com/api/songs/put",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(simplifiedSong),
        }
      );

      if (!response.ok) {
        console.error("Failed to save song", await response.text());
      }
    } catch (error) {
      console.error("Error checking or adding song:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-700 flex items-center justify-center p-8">
      <Head>
        <title>Birthday</title>
      </Head>
      {/* Window Frame */}
      {showRSVP && <RSVPModal onClose={() => setShowRSVP(false)} />}
      <div className="border border-black w-4/5 max-w-[700px] bg-gray-300 shadow-[6px_6px_0px_black]">
        {/* Title Bar */}
        <div className="flex items-center justify-between bg-gray-500 px-4 py-2 border-b border-black">
          <span className="text-md font-bold text-white">
            Ethan&apos;s Birthday Rager
          </span>
          <div className="flex space-x-2">
            <button className="w-4 h-4 bg-gray-800 border border-white"></button>
            <button className="w-4 h-4 bg-gray-800 border border-white"></button>
            <button className="w-4 h-4 bg-red-600 border border-white"></button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 font-[Arial] text-black">
          <h1 className="text-3xl font-bold text-center text-red-600 drop-shadow-[3px_3px_0px_white]">
            You Know It&apos;s a Party If...
          </h1>
          <p className="text-center text-xl  m-3">Event Passed</p>
          <p className="text-center text-xl  mb-8">Address Redacted</p>

          {/* Search Box */}
          <div className="relative w-full max-w-lg mx-auto border border-black bg-gray-200 p-3">
            <input
              type="text"
              placeholder="Search for a song..."
              className="w-full p-2 border border-black bg-white text-base  focus:outline-none focus:ring-2 focus:ring-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={handleSearch}
              className="w-full mt-3 bg-gray-300 border border-black py-2 
        shadow-[inset_-3px_-3px_0px_#ddd,inset_3px_3px_0px_#555] 
        hover:bg-gray-400 
        active:shadow-[inset_3px_3px_0px_#555,inset_-3px_-3px_0px_#ddd] 
        active:translate-y-[2px] active:translate-x-[2px]"
            >
              Search
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute left-0 w-full max-w-lg border border-black bg-white mt-2 z-10 shadow-lg max-h-60 overflow-y-auto"
              >
                {searchResults.length === 0 ? (
                  <p className="text-gray-700 p-3">No results found.</p>
                ) : (
                  searchResults.map((song) => (
                    <div
                      key={song.id}
                      className="p-3 border-b border-black last:border-b-0 flex justify-between items-center hover:bg-gray-400 cursor-pointer"
                      onClick={(event) => {
                        addSongToList(song);
                        event.stopPropagation();
                      }}
                    >
                      <span className="text-sm">
                        {song.name} - {song.artists[0].name}
                      </span>
                      {!existingSongs.has(song.id) && (
                        <button
                          className="border border-black bg-gray-300 px-3 py-1 text-sm shadow-[inset_-3px_-3px_0px_#ddd,inset_3px_3px_0px_#555] 
                  hover:bg-gray-400 active:shadow-[inset_3px_3px_0px_#555,inset_-3px_-3px_0px_#ddd] active:translate-y-[2px] active:translate-x-[2px]"
                        >
                          +
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="mt-6 w-full max-w-lg mx-auto border border-black bg-gray-200 p-3">
            <label
              className="flex items-center space-x-3 cursor-pointer border border-black bg-gray-300 px-5 py-2 
        shadow-[inset_-3px_-3px_0px_#ddd,inset_3px_3px_0px_#555] 
        hover:bg-gray-400 
        active:shadow-[inset_3px_3px_0px_#555,inset_-3px_-3px_0px_#ddd] 
        active:translate-y-[2px] active:translate-x-[2px] w-full"
            >
              <span className="text-base">Upload Photos Recruiters!</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* Photo Carousel */}
          {photos.length > 0 ? (
            <div className="relative w-full max-w-lg mx-auto border border-black bg-gray-200 pb-2 pt-4 flex items-center justify-center h-[200px]">
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 text-black text-lg"
              >
                ◀
              </button>
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={photos[currentPhotoIndex]}
                  alt="Uploaded"
                  className="max-w-full max-h-full border border-black object-contain"
                />
              </div>
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 text-black text-lg"
              >
                ▶
              </button>
            </div>
          ) : (
            <p className="text-center text-sm mt-4 w-full max-w-md mx-auto">
              No photos uploaded yet.
            </p>
          )}

          {/* "See Playlist" Button */}
          <div className="mt-6 flex justify-center">
            <Link
              href="/birthday/spotify"
              className="px-5 py-3 border border-black bg-gray-300 shadow-[inset_-3px_-3px_0px_#ddd,inset_3px_3px_0px_#555] 
        hover:bg-gray-400 active:shadow-[inset_3px_3px_0px_#555,inset_-3px_-3px_0px_#ddd] active:translate-y-[2px] active:translate-x-[2px] text-lg"
            >
              See Playlist
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
