const { Router } = require('express');
const ctrl = require('../controllers/tasks');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/stats', ctrl.stats);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
