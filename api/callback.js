// Vercel Serverless Function: GitHub OAuth callback handler
// Bu fonksiyon Decap CMS'in GitHub ile kimlik doğrulamasını sağlar

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'OAuth credentials not configured' });
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    });

    const tokenRes = await fetch(
      `https://github.com/login/oauth/access_token?${params}`,
      { method: 'POST', headers: { Accept: 'application/json' } }
    );
    const data = await tokenRes.json();

    if (data.error) {
      const errMsg = JSON.stringify({ error: data.error, error_description: data.error_description });
      return res.send(`<!DOCTYPE html><html><body><script>
        (window.opener || window.parent).postMessage(
          'authorization:github:error:${errMsg}', '*'
        );
        window.close();
      </script></body></html>`);
    }

    const successMsg = JSON.stringify({ token: data.access_token, provider: 'github' });
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html><html><body><script>
      (window.opener || window.parent).postMessage(
        'authorization:github:success:${successMsg}', '*'
      );
      window.close();
    </script></body></html>`);

  } catch (err) {
    const errMsg = JSON.stringify({ message: err.message });
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(`<!DOCTYPE html><html><body><script>
      (window.opener || window.parent).postMessage(
        'authorization:github:error:${errMsg}', '*'
      );
      window.close();
    </script></body></html>`);
  }
}
