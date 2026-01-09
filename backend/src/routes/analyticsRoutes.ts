import express from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { verifyAuth } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/sites', verifyAuth, analyticsController.getSites);
router.get('/site/:siteId', verifyAuth, analyticsController.getSiteAnalytics);
router.get('/aggregated', verifyAuth, analyticsController.getAggregatedAnalytics);

export default router;
