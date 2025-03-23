export default async function handler(req, res) {
    const code = req.query.code;
  
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }
  
    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code'
        })
      });
  
      const tokenData = await tokenRes.json();
  
      if (tokenData.error) {
        return res.status(400).json({ error: tokenData.error });
      }
  
      // Get user info
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });
  
      const userInfo = await userInfoRes.json();
  
      // Do something with the user info
      // For demo: return the user info
      // In real life, you would create/find the user in your database here
  
      // Example of returning user info (or you can redirect somewhere)
      res.status(200).json({ user: userInfo });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  