import { createClient } from 'redis';

// Check TCP connection configured
const redisUrl = process.env.REDIS_URL;

// Check HTTP REST configured
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasRedisConfig = !!(redisUrl || (kvUrl && kvToken));

let tcpClient = null;

async function getTcpClient() {
  if (!redisUrl) return null;
  
  if (!tcpClient) {
    tcpClient = createClient({ 
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });
    tcpClient.on('error', (err) => console.error('Redis Client Error:', err));
    await tcpClient.connect();
  } else if (!tcpClient.isOpen) {
    await tcpClient.connect();
  }
  
  return tcpClient;
}

export async function isLiveConnection() {
  if (redisUrl) {
    try {
      const client = await getTcpClient();
      await client.ping();
      return true;
    } catch (e) {
      console.error('TCP Ping failed:', e);
      return false;
    }
  }
  
  if (kvUrl && kvToken) {
    try {
      const res = await fetch(`${kvUrl}/ping`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const data = await res.json();
      return data.result === 'PONG';
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

// Increment page views: path view count
export async function incrementPageView(path) {
  if (redisUrl) {
    try {
      const client = await getTcpClient();
      await client.hIncrBy('pageviews', path, 1);
      return;
    } catch (e) {
      console.error('Local TCP Redis increment error:', e);
    }
  }
  
  if (kvUrl && kvToken) {
    try {
      await fetch(`${kvUrl}/hincrby/pageviews/${encodeURIComponent(path)}/1`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` }
      });
    } catch (e) {
      console.error('HTTP Redis increment error:', e);
    }
  }
}

// Increment period/date view count
export async function incrementCount(key) {
  if (redisUrl) {
    try {
      const client = await getTcpClient();
      await client.incr(key);
      return;
    } catch (e) {
      console.error('Local TCP Redis incr error:', e);
    }
  }
  
  if (kvUrl && kvToken) {
    try {
      await fetch(`${kvUrl}/incr/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` }
      });
    } catch (e) {
      console.error('HTTP Redis incr error:', e);
    }
  }
}

// Fetch page views HASH map
export async function getPageViews() {
  if (redisUrl) {
    try {
      const client = await getTcpClient();
      const result = await client.hGetAll('pageviews') || {};
      
      const pv = {};
      for (const [k, v] of Object.entries(result)) {
        pv[k] = parseInt(v) || 0;
      }
      return pv;
    } catch (e) {
      throw e;
    }
  }
  
  if (kvUrl && kvToken) {
    const res = await fetch(`${kvUrl}/hgetall/pageviews`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    if (!res.ok) {
      throw new Error(`HTTP Error response from Redis REST: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const pv = {};
    if (data && Array.isArray(data.result)) {
      for (let i = 0; i < data.result.length; i += 2) {
        pv[data.result[i]] = parseInt(data.result[i+1]) || 0;
      }
    } else if (data && data.error) {
      throw new Error(`Redis REST error: ${data.error}`);
    }
    return pv;
  }
  
  throw new Error('No Redis environment variables configured.');
}

// Fetch multi keys
export async function getKeysValues(keysWithLabels) {
  if (redisUrl) {
    try {
      const client = await getTcpClient();
      const result = [];
      for (const item of keysWithLabels) {
        const val = await client.get(item.key);
        result.push({
          date: item.label,
          views: parseInt(val) || 0
        });
      }
      return result;
    } catch (e) {
      throw e;
    }
  }
  
  if (kvUrl && kvToken) {
    const result = [];
    for (const item of keysWithLabels) {
      const res = await fetch(`${kvUrl}/get/${item.key}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const data = await res.json();
      result.push({
        date: item.label,
        views: data && data.result ? parseInt(data.result) : 0
      });
    }
    return result;
  }
  
  return [];
}
