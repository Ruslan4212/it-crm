const { Router } = require('express');
const ctrl = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/login', ctrl.login);
router.post('/register', ctrl.register);
router.get('/me', authenticate, ctrl.me);
router.put('/password', authenticate, ctrl.changePassword);

module.exports = router;
