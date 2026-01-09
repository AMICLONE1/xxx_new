import express from 'express';
import { kycController } from '../controllers/kycController';
import { verifyAuth } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/documents', verifyAuth, kycController.submitKyc);
router.get('/status', verifyAuth, kycController.getKycStatus);

export default router;
