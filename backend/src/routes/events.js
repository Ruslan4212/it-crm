const { Router } = require('express');
const ctrl = require('../controllers/events');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/today', ctrl.today);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
