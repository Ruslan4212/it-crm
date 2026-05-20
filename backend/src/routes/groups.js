const { Router } = require('express');
const ctrl = require('../controllers/groups');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/public', async (req, res) => {
  const { pool } = require('../db');
  const result = await pool.query('SELECT id, name FROM groups_table ORDER BY name');
  res.json(result.rows);
});

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/members', ctrl.addMember);
router.delete('/:id/members/:userId', ctrl.removeMember);

module.exports = router;
