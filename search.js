exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  
  let body;
  try { body = JSON.parse(event.body); } 
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Ongeldige input' }) }; }

  const { url } = body;
  if (!url) return { statusCode: 400, body: JSON.stringify({ error: 'Geen URL' }) };

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ThailandTrip/1.0)' },
      signal: AbortSignal.timeout(8000)
    });
    const html = await response.text();

    // Extract meta tags
    const getTag = (pattern) => { const m = html.match(pattern); return m ? m[1].trim() : ''; };
    
    const title = getTag(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
                  getTag(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i) ||
                  getTag(/<title[^>]*>([^<]+)<\/title>/i) || '';
    
    const desc = getTag(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i) ||
                 getTag(/<meta[^>]*content="([^"]+)"[^>]*property="og:description"/i) ||
                 getTag(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
                 getTag(/<meta[^>]*content="([^"]+)"[^>]*name="description"/i) || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: title.substring(0, 100), 
        desc: desc.substring(0, 300) 
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Kon URL niet ophalen: ' + err.message }) };
  }
};
