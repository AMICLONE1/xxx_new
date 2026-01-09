import express from 'express';
import { tradingController } from '../controllers/tradingController';
import { verifyAuth } from '../middlewares/authMiddleware';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyAuth);

router.post('/search', tradingController.searchSellers);
router.post('/orders', tradingController.createOrder);
router.get('/orders/active', tradingController.getActiveOrders); // Specific route before parametrized one
router.get('/orders/:id/status', tradingController.getOrderStatus);
router.post('/orders/:id/cancel', tradingController.cancelOrder);

export default router;
