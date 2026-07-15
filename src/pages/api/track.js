export const prerender = false;

export async function POST({ request }) {
  try {
    const { path } = await request.json();
    if (!path) {
      return new Response(JSON.stringify({ error: 'Path required' }), { status: 400 });
    }

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (kvUrl && kvToken) {
      // Temizlenmiş path formatı (XSS veya hatalı tuş kirliliğini önlemek için)
      const cleanPath = path.split('?')[0].split('#')[0] || '/';
      
      // Redis Hash tablosunda bu sayfanın izlenme değerini artır (pageviews -> path)
      await fetch(`${kvUrl}/hincrby/pageviews/${encodeURIComponent(cleanPath)}/1`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` }
      });

      // Günlük, Saatlik ve Aylık toplam hit değerlerini artır
      const now = new Date();
      // Türkiye saati (UTC+3) veya sunucu saatine göre düzeltmek için yerel tarih alalım
      const offset = 3 * 60 * 60 * 1000; // UTC+3
      const trTime = new Date(now.getTime() + offset);
      const today = trTime.toISOString().split('T')[0];
      const hour = trTime.getUTCHours();
      const month = today.substring(0, 7); // YYYY-MM

      // Günlük hit
      await fetch(`${kvUrl}/incr/views:${today}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` }
      });

      // Saatlik hit
      await fetch(`${kvUrl}/incr/views:hour:${today}-${hour}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` }
      });

      // Aylık hit
      await fetch(`${kvUrl}/incr/views:month:${month}`, {
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
