export const prerender = false;

export async function GET({ request }) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'day'; // 'hour', 'day', 'month'

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  let isLive = false;
  let pageviews = {};
  let chartData = [];

  const now = new Date();
  const offset = 3 * 60 * 60 * 1000; // UTC+3
  const trTime = new Date(now.getTime() + offset);

  // Periyot bazlı anahtarları ve etiketleri üretelim
  let keysToFetch = [];
  if (period === 'hour') {
    // Son 24 saat
    keysToFetch = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(trTime.getTime() - i * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const hourVal = d.getUTCHours();
      return {
        key: `views:hour:${dateStr}-${hourVal}`,
        label: `${hourVal}:00`
      };
    }).reverse();
  } else if (period === 'month') {
    // Son 12 ay
    keysToFetch = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(trTime.getFullYear(), trTime.getMonth() - i, 1);
      const monthStr = d.toISOString().substring(0, 7); // YYYY-MM
      return {
        key: `views:month:${monthStr}`,
        label: d.toLocaleString('tr-TR', { month: 'short', year: '2-digit' })
      };
    }).reverse();
  } else {
    // Son 7 gün (varsayılan)
    keysToFetch = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(trTime.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      return {
        key: `views:${dateStr}`,
        label: d.getDate() + ' ' + d.toLocaleString('tr-TR', { month: 'short' })
      };
    }).reverse();
  }

  if (kvUrl && kvToken) {
    try {
      // 1. Tüm sayfa gösterimlerini al
      const pvRes = await fetch(`${kvUrl}/hgetall/pageviews`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const pvData = await pvRes.json();
      
      if (pvData && Array.isArray(pvData.result)) {
        isLive = true;
        for (let i = 0; i < pvData.result.length; i += 2) {
          const path = pvData.result[i];
          const count = parseInt(pvData.result[i+1]) || 0;
          pageviews[path] = count;
        }
      }

      // 2. Periyodik grafik verilerini al
      for (const item of keysToFetch) {
        const dRes = await fetch(`${kvUrl}/get/${item.key}`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        const dData = await dRes.json();
        const viewsCount = dData && dData.result ? parseInt(dData.result) : 0;
        chartData.push({
          date: item.label,
          views: viewsCount
        });
      }
    } catch (e) {
      isLive = false;
    }
  }

  // Eğer canlı bağlantı yoksa (simülasyon) gerçekçi mock verileri oluştur
  if (!isLive || Object.keys(pageviews).length === 0) {
    pageviews = {
      '/': 382,
      '/kurslar/piyano': 184,
      '/kurslar/gitar': 142,
      '/kurslar/bateri': 118,
      '/kurslar/telli-uflemeli': 89
    };

    if (period === 'hour') {
      chartData = keysToFetch.map((h) => {
        const hourNum = parseInt(h.label.split(':')[0]);
        // Gün içi trafik eğrisi: Öğleden sonra (14-20) zirve yapar
        const peakFactor = Math.max(0, Math.sin(((hourNum - 8) / 16) * Math.PI));
        const base = Math.floor(5 + peakFactor * 28 + Math.random() * 6);
        return {
          date: h.label,
          views: base
        };
      });
    } else if (period === 'month') {
      chartData = keysToFetch.map((m) => {
        const parts = m.key.split(':');
        const monthNum = parseInt(parts[parts.length - 1].split('-')[1]) || 1;
        // Sezonluk okullaşma eğrisi: Eylül-Mayıs yüksek, Yaz düşük
        let seasonalFactor = 1.0;
        if (monthNum === 6 || monthNum === 7 || monthNum === 8) {
          seasonalFactor = 0.45; // Yaz tatili düşüşü
        } else if (monthNum === 9 || monthNum === 10 || monthNum === 5) {
          seasonalFactor = 1.45; // Dönem başlangıcı/sonu yoğunluğu
        }
        const base = Math.floor(1300 * seasonalFactor + Math.random() * 120);
        return {
          date: m.label,
          views: base
        };
      });
    } else {
      chartData = keysToFetch.map((d, index) => {
        const dayOfWeek = new Date(d.key.replace('views:', '')).getDay();
        const weekendBonus = (dayOfWeek === 0 || dayOfWeek === 6) ? 35 : 0;
        const base = 70 + Math.floor(Math.sin(index) * 15) + weekendBonus;
        return {
          date: d.label,
          views: base
        };
      });
    }
  }

  // Sayfa yollarını kullanıcı dostu isimlere dönüştürelim
  const friendlyPageviews = {};
  const pathTranslations = {
    '/': 'Ana Sayfa',
    '/kurslar/piyano': 'Piyano Kursu',
    '/kurslar/gitar': 'Gitar Kursu',
    '/kurslar/bateri': 'Bateri Kursu',
    '/kurslar/telli-uflemeli': 'Keman & Telli Kursu'
  };

  Object.entries(pageviews).forEach(([path, count]) => {
    // URL parametrelerini temizle ve eşleştir
    const cleanPath = path.split('?')[0].split('#')[0] || '/';
    const translatedName = pathTranslations[cleanPath] || cleanPath;
    friendlyPageviews[translatedName] = (friendlyPageviews[translatedName] || 0) + count;
  });

  return new Response(JSON.stringify({ isLive, pageviews: friendlyPageviews, dailyViews: chartData }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
