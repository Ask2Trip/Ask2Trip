const webhookUrl = process.argv[2];
if (!webhookUrl) { console.log('Usage: node test_discord.js <WEBHOOK_URL>'); process.exit(1); }

fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: '✅ **Ask2Trip** — test de notification Discord OK ! Les alertes de fallback IA fonctionnent.' })
}).then(r => console.log('Status:', r.status, r.ok ? '→ Discord reçu ✓' : '→ Erreur')).catch(e => console.error('Erreur:', e.message));
