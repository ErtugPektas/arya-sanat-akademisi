export const prerender = false;

export async function POST({ request, cookies }) {
  // Check session cookie
  const isLoggedIn = cookies.has('admin_session') && cookies.get('admin_session').value === 'true';

  if (!isLoggedIn) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { announcements } = await request.json();
    if (!announcements || !Array.isArray(announcements)) {
      return new Response(JSON.stringify({ error: 'Announcements array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const repo = "ErtugPektas/arya-sanat-akademisi";
    const filePath = "src/content/duyurular.json";

    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN environment variable is not set on Vercel.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Get current file content and SHA from GitHub
    const getUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Astro-Admin-Panel'
    };

    const getRes = await fetch(getUrl, { headers });
    let sha = null;

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    // 2. Format JSON beautifully
    const newContent = JSON.stringify(announcements, null, 2);

    // 3. Commit updated content back to GitHub
    const putUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const newContentBase64 = Buffer.from(newContent).toString('base64');
    
    const putBody = {
      message: 'update announcements and campaigns content',
      content: newContentBase64
    };
    if (sha) {
      putBody.sha = sha;
    }

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const putErr = await putRes.text();
      return new Response(JSON.stringify({ error: `GitHub commit failed: ${putErr}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
