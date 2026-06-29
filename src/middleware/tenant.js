const db = require('../db');

const DEFAULT_FEATURES = {
  maintenance: true,
  documents: true,
  surveys: true,
  reservations: true,
  visitors: true,
  staff: true,
  messaging: true,
};

async function tenantMiddleware(req, res, next) {
  const subdomain = req.headers['x-tenant'];

  if (!subdomain || subdomain === 'www' || subdomain === 'api') {
    req.tenant = null;
    return next();
  }

  try {
    const { rows } = await db.query(
      'SELECT id, name, subdomain, plan, features, settings FROM buildings WHERE subdomain = $1',
      [subdomain]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Site bulunamadı. Subdomain geçersiz.' });
    }

    const t = rows[0];
    req.tenant = {
      id: t.id,
      name: t.name,
      subdomain: t.subdomain,
      plan: t.plan || 'pro',
      features: { ...DEFAULT_FEATURES, ...(t.features || {}) },
      settings: t.settings || {},
    };
    next();
  } catch (err) {
    next(err);
  }
}

function requireFeature(key) {
  return (req, res, next) => {
    if (!req.tenant) return res.status(404).json({ error: 'Tenant bulunamadı' });
    if (!req.tenant.features?.[key]) {
      return res.status(403).json({ error: 'Bu özellik planınızda kapalı', feature: key });
    }
    next();
  };
}

module.exports = tenantMiddleware;
module.exports.requireFeature = requireFeature;
