export const prerender = false;

export async function GET() {
  const cid = process.env.GITHUB_CLIENT_ID;
  const csec = process.env.GITHUB_CLIENT_SECRET;
  
  return new Response(JSON.stringify({
    has_client_id: !!cid,
    client_id_length: cid ? cid.length : 0,
    has_client_secret: !!csec,
    client_secret_length: csec ? csec.length : 0,
    env_keys: Object.keys(process.env).filter(k => k.includes('GITHUB') || k.includes('CLIENT'))
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
