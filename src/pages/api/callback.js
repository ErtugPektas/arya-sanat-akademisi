export const prerender = false;

export async function GET({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing code parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const clientId = import.meta.env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
  const clientSecret = import.meta.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'OAuth credentials not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
      return new Response(`<!DOCTYPE html><html><body><script>
        (window.opener || window.parent).postMessage(
          'authorization:github:error:${errMsg}', '*'
        );
        window.close();
      </script></body></html>`, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const successMsg = JSON.stringify({ token: data.access_token, provider: 'github' });
    return new Response(`<!DOCTYPE html><html><body><script>
      (window.opener || window.parent).postMessage(
        'authorization:github:success:${successMsg}', '*'
      );
      window.close();
    </script></body></html>`, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (err) {
    const errMsg = JSON.stringify({ message: err.message });
    return new Response(`<!DOCTYPE html><html><body><script>
      (window.opener || window.parent).postMessage(
        'authorization:github:error:${errMsg}', '*'
      );
      window.close();
    </script></body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}
