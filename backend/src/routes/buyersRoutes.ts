import express from 'express';
import { buyersController } from '../controllers/buyersController';
import { verifyAuth } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', verifyAuth, buyersController.getBuyers);
router.post('/', verifyAuth, buyersController.createBuyer);
router.get('/:id', verifyAuth, buyersController.getBuyer);
router.delete('/:id', verifyAuth, buyersController.deleteBuyer);

export default router;
