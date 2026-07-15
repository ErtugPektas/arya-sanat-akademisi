export const prerender = false;

export async function GET() {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  let isLive = false;
  let pageviews = {};
  let dailyViews = [];

  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  if (kvUrl && kvToken) {
    try {
      // 1. Tüm sayfa gösterimlerini (pageviews Hash) al
      const pvRes = await fetch(`${kvUrl}/hgetall/pageviews`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const pvData = await pvRes.json();
      
      if (pvData && Array.isArray(pvData.result)) {
        isLive = true;
        // Redis HGETALL düz bir dizi döner: [key1, value1, key2, value2...]
        for (let i = 0; i < pvData.result.length; i += 2) {
          const path = pvData.result[i];
          const count = parseInt(pvData.result[i+1]) || 0;
          pageviews[path] = count;
        }
      }

      // 2. Son 7 günün günlük trafik değerlerini al
      for (const day of last7Days) {
        const dRes = await fetch(`${kvUrl}/get/views:${day}`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        const dData = await dRes.json();
        const viewsCount = dData && dData.result ? parseInt(dData.result) : 0;
        dailyViews.push({
          date: day,
          views: viewsCount
        });
      }
    } catch (e) {
      isLive = false;
    }
  }

  // Eğer canlı bağlantı yoksa (henüz KV bağlanmadıysa) şık mock veriler göster
  if (!isLive || Object.keys(pageviews).length === 0) {
    pageviews = {
      '/': 382,
      '/kurslar/piyano': 184,
      '/kurslar/gitar': 142,
      '/kurslar/bateri': 118,
      '/kurslar/telli-uflemeli': 89
    };

    dailyViews = last7Days.map((day, index) => {
      // Çarşamba/Haftasonu artışlarını simüle et
      const dayOfWeek = new Date(day).getDay();
      const weekendBonus = (dayOfWeek === 0 || dayOfWeek === 6) ? 35 : 0;
      const base = 70 + Math.floor(Math.sin(index) * 15) + weekendBonus;
      return {
        date: day,
        views: base
      };
    });
  }

  return new Response(JSON.stringify({ isLive, pageviews, dailyViews }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
