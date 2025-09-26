const express = require('express');
const ctrl = require('../controllers/healthLogController');
const { body } = require('express-validator');

const router = express.Router();

router.get('/', ctrl.getHealthLogs);
router.get('/stats/monthly', ctrl.getMonthlyStats);
router.get('/:id', ctrl.getHealthLogById);
router.post('/', [
	body('activityType').isString().notEmpty().withMessage('activityType is required'),
	body('value').isNumeric().withMessage('value must be a number'),
	body('occurredAt').optional().isISO8601().withMessage('occurredAt must be ISO8601 date string'),
], ctrl.createHealthLog);

router.put('/:id', [
	body('activityType').optional().isString().withMessage('activityType must be a string'),
	body('value').optional().isNumeric().withMessage('value must be a number'),
	body('occurredAt').optional().isISO8601().withMessage('occurredAt must be ISO8601 date string'),
], ctrl.updateHealthLog);
router.delete('/:id', ctrl.deleteHealthLog);

module.exports = router;


