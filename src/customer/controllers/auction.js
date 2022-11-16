import Auction from '../../models/auction.js';
import Bid from '../../models/bid.js';
import { getUserWallet } from '../../services/user.js';
import APIError from '../../utils/error.js';

export const createAuction = async (req, res) => {
  const wallet = await getUserWallet(req.user.id);

  if (wallet.redeemable < req.body.weight)
    throw new APIError(
      'insufficient gold balance',
      APIError.INSUFFICIENT_GOLD_BALANCE
    );

  const data = new Auction({
    user: req.user.id,
    weight: req.body.weight,
    rate: req.body.rate,
    status: 'active',
  });

  await data.save();

  res.status(201).json(data);
};

export const getAuctions = async (req, res) => {
  const data = await Auction.find({
    status: 'active',
  });

  res.json(
    data.map((item) => ({
      id: item.id,
      weight: item.weight,
      rate: item.rate,
      bidCount: item.bidCount,
      createdAt: item.createdAt,
    }))
  );
};

export const getAuctionById = async (req, res) => {
  const data = await Auction.findById(req.params.id);

  if (!data)
    throw new APIError(
      'auction does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json({
    id: data.id,
    weight: data.weight,
    rate: data.rate,
    bidCount: data.bidCount,
    createdAt: data.createdAt,
    status: data.status,
  });
};

export const cancelAuction = async (req, res) => {
  const data = await Auction.findById(req.params.id);

  if (!data)
    throw new APIError(
      'auction does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (data.status !== 'active') throw new APIError('auction is not active');
  if (!data.user.equals(req.user.id)) return res.sendStatus(403);

  data.cancelledAt = new Date();
  data.status = 'cancelled';

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const createBid = async (req, res) => {
  const auction = await Auction.findById(req.params.id).lean();

  if (!auction)
    throw new APIError(
      'auction does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const bid = new Bid({
    from: 'buyer',
    auction: auction.id,
    user: req.user.id,
    rate: req.body.rate,
    status: 'waiting',
  });

  if (req.body.rate === auction.rate) {
    bid.buyerStatus = 'accepted';
    bid.isCounter = true;
  }

  await bid.save();
  await Auction.updateOne({ _id: auction.id }, { $inc: { bidCount: 1 } });

  res.status(201).json(bid);
};

export const getBids = async (req, res) => {
  const auction = await Auction.findById(req.params.id).lean();

  if (!auction)
    throw new APIError(
      'auction does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const query = Bid.find({ auction: auction?.id });

  switch (req.query.type) {
    case 'latest':
      query.where({ from: 'buyer', buyerStatus: ['waiting', 'accepted'] });
      break;
    case 'counter_offer':
      query.where({ from: 'seller', isCounter: true });
      break;
    case 'in_process':
      query.where({ sellerStatus: 'accepted' });
      break;
    case 'accepted':
      query.where({ status: ['accepted', 'completed', 'expired'] });
      break;
    case 'rejected':
      query.where({ status: 'rejected' });
      break;
  }

  const data = await query.lean();

  res.json(
    data.map((item) => ({
      id: item.id,
      weight: auction.weight,
      actualRate: auction.rate,
      rate: item.rate,
      createdAt: item.createdAt,
      buyerStatus: item.buyerStatus,
      sellerStatus: item.sellerStatus,
      status: item.status,
    }))
  );
};

export const getBidById = async (req, res) => {
  const data = await Bid.findById(req.params.bidId).lean();
  if (!data)
    throw new APIError('bid does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  res.json(data);
};

export const acceptBid = async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  const bid = await Bid.findById(req.params.bidId);

  if (!auction)
    throw new APIError(
      'auction does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  if (auction.status !== 'active') throw new APIError('auction is not active');
  if (!auction.user.equals(req.user.id)) return res.sendStatus(403);
  if (!bid)
    throw new APIError('bid does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  if (bid.buyerStatus === 'accepted') {
    bid.sellerStatus = 'accepted';
    bid.status = 'accepted';

    auction.bid = bid.id;
    auction.status = 'waiting';
  } else {
    bid.sellerStatus = 'accepted';
  }

  auction.account = req.body.account;

  await bid.save();
  await auction.save();
  if (auction.status === 'waiting') {
    // hold gold
  }

  res.status(201).json({
    message: 'success',
  });
};

export const rejectBid = async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  const bid = await Bid.findById(req.params.bidId);

  if (!auction)
    throw new APIError(
      'auction does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  if (data.status !== 'active') throw new APIError('auction is not active');
  if (!data.user.equals(req.user.id)) return res.sendStatus(403);
  if (!bid)
    throw new APIError('bid does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  bid.sellerStatus = 'rejected';
  bid.status = 'rejected';

  await bid.save();

  res.status(201).json({
    message: 'success',
  });
};

export const counterBid = async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  const bid = await Bid.findById(req.params.bidId);

  if (!auction)
    throw new APIError(
      'auction does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  if (auction.status !== 'active') throw new APIError('auction is not active');
  if (!auction.user.equals(req.user.id)) return res.sendStatus(403);
  if (!bid)
    throw new APIError('bid does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  const newBid = await Bid.create({
    from: 'seller',
    isCounter: true,
    auction: auction.id,
    user: req.user.id,
    rate: req.body.rate,
    sellerStatus: 'accepted',
    status: 'waiting',
  });

  res.status(201).json(newBid);
};

export const getMyBids = async (req, res) => {
  const query = Bid.find({ user: req.user.id }).populate('auction');

  switch (req.query.type) {
    case 'counter_offer':
      query.where({ from: 'buyer', isCounter: true });
      break;
    case 'in_process':
      query.where({ from: '', sellerStatus: 'accepted' });
      break;
    case 'accepted':
      query.where({ status: ['accepted', 'expired', 'completed'] });
      break;
    case 'rejected':
      query.where({ status: 'rejected' });
      break;
  }

  const data = await query.lean();

  res.json(
    data.map((item) => ({
      id: item.id,
      weight: item.auction.weight,
      actualRate: item.auction.rate,
      rate: item.rate,
      createdAt: item.createdAt,
      buyerStatus: item.buyerStatus,
      sellerStatus: item.sellerStatus,
      status: item.status,
    }))
  );
};

export const acceptMyBid = async (req, res) => {};

export const rejectMyBid = async (req, res) => {};
