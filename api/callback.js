// Vercel Serverless Function: GitHub OAuth callback handler
// Bu fonksiyon Decap CMS'in GitHub ile kimlik doğrulamasını sağlar

export default function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  // GitHub OAuth token exchange
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    code: code,
  });

  fetch(`https://github.com/login/oauth/access_token?${params}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.error) {
        return res.status(400).send(`
          <script>
            window.opener.postMessage(
              'authorization:github:error:${JSON.stringify(data)}',
              '*'
            );
            window.close();
          </script>
        `);
      }

      res.send(`
        <script>
          window.opener.postMessage(
            'authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}',
            '*'
          );
          window.close();
        </script>
      `);
    })
    .catch((err) => {
      res.status(500).send(`
        <script>
          window.opener.postMessage(
            'authorization:github:error:${JSON.stringify({ message: err.message })}',
            '*'
          );
          window.close();
        </script>
      `);
    });
}
