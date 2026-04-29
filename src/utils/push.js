const db = require('../db');
const https = require('https');

async function sendPushToBuilding(buildingId, title, body, userIds = null, adminOnly = false) {
  try {
    let sql = 'SELECT pt.token FROM push_tokens pt JOIN users u ON pt.user_id = u.id WHERE u.building_id = $1';
    const params = [buildingId];

    if (adminOnly) {
      sql += ' AND u.role = $2';
      params.push('admin');
    } else if (userIds?.length) {
      sql += ` AND pt.user_id = ANY($${params.length + 1})`;
      params.push(userIds);
    }

    const { rows } = await db.query(sql, params);
    if (!rows.length) return;

    const tokens = rows.map(r => r.token).filter(t => t.startsWith('ExponentPushToken'));
    if (!tokens.length) return;

    const messages = tokens.map(to => ({ to, title, body, sound: 'default', data: {} }));
    const payload = JSON.stringify(messages);

    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Accept-Encoding': 'gzip, deflate' },
    };

    const req = https.request(options);
    req.write(payload);
    req.end();
  } catch (e) {
    console.error('Push notification hatası:', e.message);
  }
}

module.exports = { sendPushToBuilding };
