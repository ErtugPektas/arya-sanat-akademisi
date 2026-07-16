import { incrementPageView, incrementCount, hasRedisConfig } from '../../utils/redis.js';

export const prerender = false;

export async function POST({ request }) {
  try {
    const { path } = await request.json();
    if (!path) {
      return new Response(JSON.stringify({ error: 'Path required' }), { status: 400 });
    }

    if (hasRedisConfig) {
      const cleanPath = path.split('?')[0].split('#')[0] || '/';
      
      // 1. Hash tablosundaki sayfa izlenmesini artır
      await incrementPageView(cleanPath);

      // 2. Günlük, Saatlik ve Aylık toplam hit değerlerini artır
      const now = new Date();
      const offset = 3 * 60 * 60 * 1000; // UTC+3
      const trTime = new Date(now.getTime() + offset);
      const today = trTime.toISOString().split('T')[0];
      const hour = trTime.getUTCHours();
      const month = today.substring(0, 7); // YYYY-MM

      await incrementCount(`views:${today}`);
      await incrementCount(`views:hour:${today}-${hour}`);
      await incrementCount(`views:month:${month}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
