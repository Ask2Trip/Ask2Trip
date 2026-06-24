// Vérification paiement Stripe — session_id (retour checkout) OU email (abonnement actif)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ valid: false, error: 'Method not allowed' });

  try {
    const { session_id, email } = req.body || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(200).json({ valid: false, error: 'Paiement non configuré (contacter le support)' });

    const stripeGet = async (path) => {
      const r = await fetch(`https://api.stripe.com/v1${path}`, {
        headers: { 'Authorization': `Basic ${Buffer.from(stripeKey + ':').toString('base64')}` }
      });
      return r.json();
    };

    // ── Vérification par session_id (retour direct après paiement) ─────────────
    if (session_id) {
      if (!session_id.startsWith('cs_')) {
        return res.status(200).json({ valid: false, error: 'Session invalide' });
      }
      const session = await stripeGet(`/checkout/sessions/${session_id}`);
      if (session.error) return res.status(200).json({ valid: false, error: 'Session introuvable' });
      if (session.payment_status === 'paid') {
        return res.status(200).json({ valid: true });
      }
      return res.status(200).json({ valid: false, error: 'Paiement non finalisé (statut : ' + session.payment_status + ')' });
    }

    // ── Vérification par email (abonné qui revient ou change d'appareil) ───────
    if (email) {
      const emailClean = email.trim().toLowerCase();
      // 1. Chercher le customer Stripe par email
      const customers = await stripeGet(`/customers?email=${encodeURIComponent(emailClean)}&limit=5`);
      const customer = customers.data?.[0];
      if (!customer) {
        return res.status(200).json({ valid: false, error: 'Aucun compte trouvé pour cet email' });
      }

      // 2. Vérifier s'il a un abonnement actif (mensuel ou annuel)
      const subs = await stripeGet(`/subscriptions?customer=${customer.id}&status=active&limit=3`);
      if (subs.data?.length > 0) {
        return res.status(200).json({ valid: true });
      }

      // 3. Vérifier si c'est un achat one-time (fondateur) via PaymentIntents réussis
      const payments = await stripeGet(`/payment_intents?customer=${customer.id}&limit=20`);
      const hasPaid = payments.data?.some(pi => pi.status === 'succeeded');
      if (hasPaid) {
        return res.status(200).json({ valid: true });
      }

      return res.status(200).json({ valid: false, error: 'Aucun abonnement actif trouvé pour cet email' });
    }

    return res.status(200).json({ valid: false, error: 'session_id ou email requis' });

  } catch (err) {
    console.error('Stripe verify error:', err.message);
    return res.status(200).json({ valid: false, error: 'Erreur serveur : ' + err.message });
  }
};
