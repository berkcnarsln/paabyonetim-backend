const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/monthly', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { building_id, period } = req.query; // period: YYYY-MM
    if (!period) return res.status(400).json({ error: 'Dönem gerekli (YYYY-MM)' });

    const [year, month] = period.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const [payments, expenses, repairs, apartments, announcements] = await Promise.all([
      db.query(
        `SELECT p.status, COUNT(*) as count, SUM(p.amount) as total
         FROM payments p JOIN apartments a ON p.apartment_id = a.id
         WHERE a.building_id = $1 AND p.period = $2 GROUP BY p.status`,
        [building_id, period]
      ),
      db.query(
        `SELECT category, SUM(amount) as total FROM expenses
         WHERE building_id = $1 AND period = $2 GROUP BY category ORDER BY total DESC`,
        [building_id, period]
      ),
      db.query(
        `SELECT status, COUNT(*) as count FROM repairs
         WHERE building_id = $1 AND created_at >= $2 AND created_at <= $3 GROUP BY status`,
        [building_id, startDate, endDate + ' 23:59:59']
      ),
      db.query('SELECT COUNT(*) as total FROM apartments WHERE building_id = $1', [building_id]),
      db.query(
        `SELECT COUNT(*) as count FROM announcements
         WHERE building_id = $1 AND created_at >= $2 AND created_at <= $3`,
        [building_id, startDate, endDate + ' 23:59:59']
      ),
    ]);

    const paymentStats = {};
    payments.rows.forEach(r => { paymentStats[r.status] = { count: parseInt(r.count), total: parseFloat(r.total || 0) }; });

    const totalIncome = paymentStats['ödendi']?.total || 0;
    const totalExpense = expenses.rows.reduce((s, r) => s + parseFloat(r.total), 0);

    res.json({
      period,
      building_id,
      generated_at: new Date().toISOString(),
      apartments: { total: parseInt(apartments.rows[0]?.total || 0) },
      payments: {
        paid: paymentStats['ödendi'] || { count: 0, total: 0 },
        pending: paymentStats['bekliyor'] || { count: 0, total: 0 },
        overdue: paymentStats['gecikmiş'] || { count: 0, total: 0 },
        total_income: totalIncome,
      },
      expenses: {
        by_category: expenses.rows,
        total: totalExpense,
      },
      balance: totalIncome - totalExpense,
      repairs: repairs.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
      announcements: parseInt(announcements.rows[0]?.count || 0),
    });
  } catch (err) { next(err); }
});

module.exports = router;
