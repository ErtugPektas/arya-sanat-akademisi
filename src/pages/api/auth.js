export const prerender = false;

export async function GET({ request, redirect }) {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (provider !== 'github') {
    return new Response(JSON.stringify({ error: 'Only github provider is supported' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const clientId = import.meta.env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'GITHUB_CLIENT_ID not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const redirectUri = 'https://arya-sanat-akademisi.vercel.app/api/callback';
  const scope = 'repo,user';
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return redirect(authUrl, 302);
}
