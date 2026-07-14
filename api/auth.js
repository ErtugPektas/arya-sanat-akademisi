// Vercel Serverless Function: GitHub OAuth başlatma
// Bu fonksiyon kullanıcıyı GitHub OAuth sayfasına yönlendirir

export default function handler(req, res) {
  const { provider } = req.query;

  if (provider !== 'github') {
    return res.status(400).json({ error: 'Only github provider is supported' });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const scope = 'repo,user';
  const redirectUri = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://arya-sanat-akademisi.vercel.app'}/api/callback`;

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(authUrl);
}
