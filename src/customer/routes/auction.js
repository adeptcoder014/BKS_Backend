import { Router } from 'express';
import * as controller from '../controllers/auction.js';
import * as validation from '../validations/auction.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router
  .route('/')
  .get(controller.getAuctions)
  .post(validate(validation.createAuction), controller.createAuction);

router.get('/bids', controller.getMyBids);
router.post('/bids/:id', controller.acceptMyBid);
router.post('/bids/:id/reject', controller.rejectMyBid);

router.get('/:id', controller.getAuctionById);

router.post('/:id/cancel', controller.cancelAuction);

router
  .route('/:id/bids')
  .get(controller.getBids)
  .post(validate(validation.createBid), controller.createBid);

router.get('/:id/bids/:bidId', controller.getBidById);

router.post(
  '/:id/bids/:bidId/accept',
  validate(validation.acceptBid),
  controller.acceptBid
);

router.post(
  '/:id/bids/:bidId/reject',
  validate(validation.rejectBid),
  controller.rejectBid
);

router.post(
  '/:id/bids/:bidId/counter',
  validate(validation.counterBid),
  controller.counterBid
);

export default router;
