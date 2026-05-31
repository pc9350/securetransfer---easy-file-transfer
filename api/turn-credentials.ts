export const config = { runtime: 'edge' };

export default async function handler(): Promise<Response> {
  const keyId = process.env.CLOUDFLARE_TURN_TOKEN_ID;
  const keyToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!keyId || !keyToken) {
    return new Response(JSON.stringify({ error: 'TURN not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const cfRes = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 86400 }),
      }
    );

    if (!cfRes.ok) {
      throw new Error(`Cloudflare error: ${cfRes.status}`);
    }

    const data = await cfRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=82800',
      },
    });
  } catch (error) {
    console.error('[TURN] Credential generation failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate TURN credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
