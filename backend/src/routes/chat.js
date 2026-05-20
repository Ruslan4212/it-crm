const { Router } = require('express');
const ctrl = require('../controllers/chat');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.post('/', ctrl.chat);

module.exports = router;
