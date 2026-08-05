export default async function handler(req, res) {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  
    const clientId = "a2e6aeb9971e4287a1985803be608d24";
    const clientSecret = "cd6215638ad643acb1b251ce49139db0";
    const redirectUri = "https://www.ethanbonsall.com/birthday/spotify"; 
  
    const code = req.query.code; // Get the authorization code from the request
  
    if (!code) {
      return res.status(400).json({ error: "Authorization code missing" });
    }
  
    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
  
      if (!response.ok) {
        return res.status(response.status).json(await response.json());
      }
  
      const data = await response.json();
      res.status(200).json({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  