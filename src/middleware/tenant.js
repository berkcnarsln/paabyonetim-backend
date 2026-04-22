const db = require('../db');

async function tenantMiddleware(req, res, next) {
  // Frontend sends X-Tenant header with the subdomain
  const subdomain = req.headers['x-tenant'];

  if (!subdomain || subdomain === 'www' || subdomain === 'api') {
    req.tenant = null;
    return next();
  }

  try {
    const { rows } = await db.query(
      'SELECT id, name, subdomain FROM buildings WHERE subdomain = $1',
      [subdomain]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Site bulunamadı. Subdomain geçersiz.' });
    }

    req.tenant = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = tenantMiddleware;
