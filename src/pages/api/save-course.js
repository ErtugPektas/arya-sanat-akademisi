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
    const bodyData = await request.json();
    const {
      courseId,
      title,
      description,
      keywords,
      badge,
      heroTitle,
      heroTitleHighlight,
      heroDesc,
      image,
      videoPreview,
      duration,
      frequency,
      level,
      certificate,
      leadText,
      teacher_name,
      teacher_specialty,
      teacher_image,
      teacher_bio1,
      teacher_bio2,
      teacher_tags,
      bodyContent
    } = bodyData;

    if (!courseId) {
      return new Response(JSON.stringify({ error: 'Missing courseId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const repo = "ErtugPektas/arya-sanat-akademisi";
    const filePath = `src/content/kurslar/${courseId}.md`;

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

    let sha = undefined;
    let currentContent = '';

    const getRes = await fetch(getUrl, { headers });
    if (getRes.status === 404) {
      currentContent = `---
title: "Yeni Kurs"
description: "Yeni kurs açıklaması"
keywords: ""
badge: "⭐ Yeni Kurs"
heroTitle: "Yeni Kurs"
heroTitleHighlight: ""
heroDesc: "Yeni kurs açıklaması."
image: "/assets/kurslar/piyano-kurs.jpg"
duration: "45 dk"
frequency: "Haftada 1 ders"
level: "Başlangıç"
certificate: "Katılım Belgesi"
leadText: "Yeni Kurs leadText"
levels:
  beginner:
    title: "Başlangıç"
    desc: "Giriş"
  intermediate:
    title: "Orta"
    desc: "Gelişme"
  advanced:
    title: "İleri"
    desc: "Uzmanlık"
gallery:
  - "/assets/kurslar/piyano-kurs.jpg"
curriculum:
  - period: "1. Ay"
    title: "Giriş"
    items:
      - "Giriş konuları"
teacher:
  name: "Eğitmen Adı"
  specialty: "Branş"
  image: "/assets/teachers/default.jpg"
  bio1: "Eğitmen biyografisi."
  tags:
    - "Eğitmen"
---
Yeni kurs detay metni.`;
    } else if (!getRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch file from GitHub: ${getRes.statusText}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const fileData = await getRes.json();
      sha = fileData.sha;
      currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
    }

    // 2. Parse frontmatter and update values
    const parts = currentContent.split('---');
    if (parts.length < 3) {
      return new Response(JSON.stringify({ error: 'Invalid markdown format in current file.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let frontmatter = parts[1];
    
    // Helper to update simple string field in YAML
    const setYamlString = (yaml, key, val) => {
      const escapedVal = val.replace(/"/g, '\\"');
      const regex = new RegExp(`^${key}:\\s*.*$`, 'm');
      if (yaml.match(regex)) {
        return yaml.replace(regex, `${key}: "${escapedVal}"`);
      } else {
        return yaml + `\n${key}: "${escapedVal}"`;
      }
    };

    // Update main fields
    frontmatter = setYamlString(frontmatter, 'title', title);
    frontmatter = setYamlString(frontmatter, 'description', description);
    frontmatter = setYamlString(frontmatter, 'keywords', keywords || '');
    frontmatter = setYamlString(frontmatter, 'badge', badge);
    frontmatter = setYamlString(frontmatter, 'heroTitle', heroTitle);
    frontmatter = setYamlString(frontmatter, 'heroTitleHighlight', heroTitleHighlight);
    frontmatter = setYamlString(frontmatter, 'heroDesc', heroDesc);
    frontmatter = setYamlString(frontmatter, 'image', image);
    frontmatter = setYamlString(frontmatter, 'videoPreview', videoPreview || '');
    frontmatter = setYamlString(frontmatter, 'duration', duration);
    frontmatter = setYamlString(frontmatter, 'frequency', frequency);
    frontmatter = setYamlString(frontmatter, 'level', level);
    frontmatter = setYamlString(frontmatter, 'certificate', certificate);
    frontmatter = setYamlString(frontmatter, 'leadText', leadText);

    // Update teacher fields (handling indentation)
    const updateTeacherField = (yaml, fieldName, fieldValue) => {
      const escapedValue = fieldValue.replace(/"/g, '\\"');
      const regex = new RegExp(`(\\s+)${fieldName}:\\s*.*$`, 'm');
      if (yaml.match(regex)) {
        return yaml.replace(regex, `$1${fieldName}: "${escapedValue}"`);
      }
      return yaml;
    };

    frontmatter = updateTeacherField(frontmatter, 'name', teacher_name);
    frontmatter = updateTeacherField(frontmatter, 'specialty', teacher_specialty);
    frontmatter = updateTeacherField(frontmatter, 'image', teacher_image);
    frontmatter = updateTeacherField(frontmatter, 'bio1', teacher_bio1);
    
    if (teacher_bio2) {
      frontmatter = updateTeacherField(frontmatter, 'bio2', teacher_bio2);
    } else {
      // Remove bio2 if empty
      frontmatter = frontmatter.replace(/^\s+bio2:\s*.*$/m, '');
    }

    // Update teacher tags list
    if (teacher_tags) {
      const tagsList = teacher_tags.split(',').map(t => t.trim()).filter(Boolean);
      const tagsYaml = tagsList.map(t => `    - "${t.replace(/"/g, '\\"')}"`).join('\n');
      
      const tagsRegex = /(tags:\s*\n)(\s+-\s*.*?\n)*/m;
      if (frontmatter.match(tagsRegex)) {
        frontmatter = frontmatter.replace(tagsRegex, `$1${tagsYaml}\n`);
      }
    }

    // Reconstruct entire markdown content
    const updatedContent = `---\n${frontmatter.trim()}\n---\n${bodyContent.trim()}\n`;

    // Local development write fallback
    const isLocal = !process.env.VERCEL;
    if (isLocal) {
      const fullPath = path.resolve(process.cwd(), filePath);
      fs.writeFileSync(fullPath, updatedContent, 'utf8');
      return new Response(JSON.stringify({ success: true, local: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Commit/Push updated content to GitHub
    const putBody = JSON.stringify({
      message: `edit: course ${courseId} updated via custom admin dashboard`,
      content: Buffer.from(updatedContent, 'utf8').toString('base64'),
      sha: sha,
      branch: 'main'
    });

    const putRes = await fetch(getUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: putBody
    });

    if (!putRes.ok) {
      const errRes = await putRes.json();
      return new Response(JSON.stringify({ error: `GitHub save failed: ${errRes.message || putRes.statusText}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
