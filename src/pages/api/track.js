export const prerender = false;

export async function POST({ request }) {
  try {
    const { path } = await request.json();
    if (!path) {
      return new Response(JSON.stringify({ error: 'Path required' }), { status: 400 });
    }

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
      // Temizlenmiş path formatı (XSS veya hatalı tuş kirliliğini önlemek için)
      const cleanPath = path.split('?')[0].split('#')[0] || '/';
      
      // Redis Hash tablosunda bu sayfanın izlenme değerini artır (pageviews -> path)
      await fetch(`${kvUrl}/hincrby/pageviews/${encodeURIComponent(cleanPath)}/1`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` }
      });

      // Günlük toplam hit değerini artır (views:YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${kvUrl}/incr/views:${today}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
