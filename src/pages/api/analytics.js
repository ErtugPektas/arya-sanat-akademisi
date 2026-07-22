import { 
  getPageViews, 
  getKeysValues, 
  isLiveConnection, 
  hasRedisConfig 
} from '../../utils/redis.js';

export const prerender = false;

function getStableRandom(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 100) / 100;
}

export async function GET({ request }) {
  const url = new URL(request.url, 'https://arya-sanat-akademisi.vercel.app');
  const period = url.searchParams.get('period') || 'day'; // 'hour', 'day', 'month'

  let isLive = false;
  let pageviews = {};
  let chartData = [];
  let errorDetail = null;

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

  if (hasRedisConfig) {
    try {
      // 1. Canlı bağlantı testi yap
      const connectionOk = await isLiveConnection();
      if (connectionOk) {
        // 2. Sayfa gösterimlerini al
        pageviews = await getPageViews();
        
        // 3. Zaman serisi verilerini al
        chartData = await getKeysValues(keysToFetch);
        
        isLive = true;
      } else {
        throw new Error('Redis server connection timed out or auth failed.');
      }
    } catch (e) {
      isLive = false;
      errorDetail = e.message || String(e);
    }
  } else {
    errorDetail = 'No Redis environment variables configured. Check REDIS_URL, KV_REST_API_URL or UPSTASH_REDIS_REST_URL.';
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
        const peakFactor = Math.max(0, Math.sin(((hourNum - 8) / 16) * Math.PI));
        const stableRand = getStableRandom(h.label);
        const base = Math.floor(5 + peakFactor * 28 + stableRand * 6);
        return {
          date: h.label,
          views: base
        };
      });
    } else if (period === 'month') {
      chartData = keysToFetch.map((m) => {
        const parts = m.key.split(':');
        const monthNum = parseInt(parts[parts.length - 1].split('-')[1]) || 1;
        let seasonalFactor = 1.0;
        if (monthNum === 6 || monthNum === 7 || monthNum === 8) {
          seasonalFactor = 0.45;
        } else if (monthNum === 9 || monthNum === 10 || monthNum === 5) {
          seasonalFactor = 1.45;
        }
        const stableRand = getStableRandom(m.label);
        const base = Math.floor(1300 * seasonalFactor + stableRand * 120);
        return {
          date: m.label,
          views: base
        };
      });
    } else {
      chartData = keysToFetch.map((d, index) => {
        const dayOfWeek = new Date(d.key.replace('views:', '')).getDay();
        const weekendBonus = (dayOfWeek === 0 || dayOfWeek === 6) ? 35 : 0;
        const stableRand = getStableRandom(d.key);
        const base = 70 + Math.floor(Math.sin(index) * 15) + weekendBonus + Math.floor(stableRand * 8);
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
    const cleanPath = path.split('?')[0].split('#')[0] || '/';
    const translatedName = pathTranslations[cleanPath] || cleanPath;
    friendlyPageviews[translatedName] = (friendlyPageviews[translatedName] || 0) + count;
  });

  // Tanılama Raporu Detayları
  const diagnostics = {
    env: {
      REDIS_URL: !!process.env.REDIS_URL,
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      GITHUB_TOKEN: !!process.env.GITHUB_TOKEN
    },
    error: errorDetail
  };

  return new Response(JSON.stringify({ isLive, pageviews: friendlyPageviews, dailyViews: chartData, diagnostics }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
