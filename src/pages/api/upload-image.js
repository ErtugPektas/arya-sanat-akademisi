import fs from 'fs';
import path from 'path';

export const prerender = false;

export async function POST({ request, cookies }) {
  const sessionCookie = cookies.get('admin_session');
  const sessionVal = sessionCookie ? sessionCookie.value : null;
  const isLoggedIn = sessionVal === 'admin' || sessionVal === 'teacher' || sessionVal === 'true';

  if (!isLoggedIn) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9\.\-_]/g, '_')}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const isLocal = !process.env.VERCEL;
    const localPath = path.join(process.cwd(), 'public', 'assets', 'uploads', filename);
    const gitFilePath = `public/assets/uploads/${filename}`;

    // If local dev environment, write directly to disk
    if (isLocal) {
      const uploadDir = path.dirname(localPath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(localPath, fileBuffer);
      
      return new Response(JSON.stringify({ 
        success: true, 
        url: `/assets/uploads/${filename}` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // In production Vercel serverless environment: push to GitHub repository
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = "ErtugPektas/arya-sanat-akademisi";

    // Fallback: Convert to Base64 Data URL if no GitHub token or if GitHub API fails
    const mimeType = file.type || 'image/jpeg';
    const base64DataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    if (!githubToken) {
      // Return Data URL if GITHUB_TOKEN is missing
      return new Response(JSON.stringify({ 
        success: true, 
        url: base64DataUrl,
        notice: 'GITHUB_TOKEN eksik olduğu için görsel veri (Base64) olarak eklendi.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const putUrl = `https://api.github.com/repos/${repo}/contents/${gitFilePath}`;
    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Astro-Admin-Panel',
      'Content-Type': 'application/json'
    };

    const putBody = JSON.stringify({
      message: `upload: media asset ${filename} uploaded via custom admin panel`,
      content: fileBuffer.toString('base64'),
      branch: 'main'
    });

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers,
      body: putBody
    });

    if (!putRes.ok) {
      // If GitHub upload fails, return base64 Data URL fallback instead of throwing error
      return new Response(JSON.stringify({ 
        success: true, 
        url: base64DataUrl,
        notice: 'GitHub yükleme uyarısı sonrası veri (Base64) olarak kaydedildi.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      url: `/assets/uploads/${filename}` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
