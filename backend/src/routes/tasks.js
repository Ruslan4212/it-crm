const { Router } = require('express');
const multer = require('multer');
const ctrl = require('../controllers/tasks');
const { authenticate } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(authenticate);

router.get('/export', ctrl.exportTasks);
router.post('/import', upload.single('file'), ctrl.importTasks);
router.get('/stats', ctrl.stats);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
