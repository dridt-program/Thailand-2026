exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key niet geconfigureerd' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } 
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Ongeldige input' }) }; }

  const { query } = body;
  if (!query) return { statusCode: 400, body: JSON.stringify({ error: 'Geen zoekopdracht' }) };

  const systemPrompt = `Je bent een Thailand-reisexpert. De familie maakt deze route in 2026:
- Bangkok (24-28 jul): aankomst, Muay Thai gevecht, fietstocht Co van Kessel
- Ayutthaya dagtrip (28 jul): tempelruines
- Nachtrein naar Chiang Mai (29 jul)
- Chiang Mai en omgeving (30 jul-3 aug): olifanten, Grand Canyon Water Park, La Lanna Resort, Golden Triangle
- Khao Sok (3-5 aug): jungle, stuwmeer
- Koh Samui (5-9 aug): strand, Angthong Marine Park
- Koh Tao (9-13 aug): PADI duiken voor tieners, fun dives
- Hua Hin (13-15 aug): rustige kuststad
- Bangkok terug (15-18 aug): shopping, fine dining

Groep: 2 volwassenen + 3 tieners. Juli-augustus is droog op de Golfkust.

Geef ALTIJD precies 3 concrete activiteitsuggesties terug als JSON array.
Elk object heeft deze velden:
- name: naam van de activiteit (string)
- segment: kies uit bangkok1/ayutthaya/chiangmai/khaosok/samui/kohtao/huahin/bangkok2
- desc: beschrijving in het Nederlands, max 2 zinnen, inclusief praktische tip
- duration: tijdsindicatie (string)
- tags: array met waarden uit cultuur/natuur/water/food/sport/tieners/must
- tip: een concrete boektip of aanbeveling (string, 1 zin)

Antwoord ALLEEN met de JSON array, geen markdown, geen uitleg.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Zoekterm: "${query}". Geef 3 passende activiteiten voor deze route.` }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API fout');

    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const suggestions = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestions)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
