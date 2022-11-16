import { GoldBox, Order, ReturnOrder } from '../../models/index.js';
import Appointment from '../../models/appointment.js';
import VerifiedGold from '../../models/verifiedGold.js';
import Gold from '../../models/gold.js';
import APIError from '../../utils/error.js';
import Dispute from '../../models/dispute.js';
import { stringToObjectId } from '../../utils/util.js';

const OldGoldRequest = {};
const VerifiedBox = {};

const parseQuery = (query) => {
  const data = { offset: 0, limit: 200, filter: {} };
  const { offset, limit, status, q } = query;

  if (offset) data.offset = parseInt(offset);
  if (limit) data.limit = parseInt(limit);
  if (q) data.filter['orderId'] = new RegExp(q, 'i');
  if (status) data.filter.status = status;

  return data;
};

export const getDeliveryOverview = async (req, res) => {
  const data = await Order.aggregate()
    .match({ merchant: stringToObjectId(req.user.id) })
    .group({ _id: '$status', count: { $sum: 1 } });

  const count = data.reduce(
    (prev, item) => {
      prev[item._id] += item.count;
      return prev;
    },
    {
      placed: 0,
      assigned: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }
  );

  res.json(count);
};

export const getDeliveryOrders = async (req, res) => {
  const query = parseQuery(req.query);
  const data = await Order.find({
    ...query.filter,
    merchant: req.user.id,
  })
    .lean()
    .skip(query.offset)
    .limit(query.limit)
    .select('orderId docketNo shipping createdAt status ');

  res.json(
    data.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      docketNo: item.shipping.docketNo ?? ' ',
      estimatedDeliveryDate: item.shipping.estimatedDeliveryDate ?? ' ',
      createdAt: item.createdAt,
      status: item.status,
    }))
  );
};

export const getDeliveryOrderById = async (req, res) => {
  const data = await Order.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  })
    .lean({ getters: true })
    .transform(
      (item) =>
        item && {
          id: item._id ?? item.id,
          orderId: item.orderId,
          address: item.shipping.address,
          estimatedDeliveryDate: item.shipping.estimatedDeliveryDate ?? '',
          items: item.items.map((product) => ({
            id: product.product,
            title: product.title,
            image: product.image,
            quantity: product.quantity,
            purity: product.purity,
            rate: product.rate,
            weight: product.weight,
            makingCharge: product.makingCharge,
            tax: product.tax,
            taxAmount: product.taxAmount,
            subtotal: product.totalAmount,
          })),
          totalAmount: item.totalAmount,
          invoice: item.invoice ?? '',
          status: item.status,
        }
    );

  if (!data)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);

  res.json(data);
};

export const getReturnOverview = async (req, res) => {
  const [data, accepted, rejected] = await Promise.all([
    ReturnOrder.aggregate()
      .match({ merchant: stringToObjectId(req.user.id) })
      .group({ _id: '$status', count: { $sum: 1 } }),
    ReturnOrder.countDocuments({
      merchant: req.user.id,
      'items.status': 'accepted',
    }),
    ReturnOrder.countDocuments({
      merchant: req.user.id,
      'items.status': 'rejected',
    }),
  ]);

  const count = data.reduce(
    (prev, item) => {
      prev[item._id] = item.count;
      return prev;
    },
    { placed: 0, shipped: 0, received: 0, assigned: 0 }
  );

  Object.assign(count, {
    accepted,
    rejected,
  });

  res.json(count);
};

export const getReturnOrders = async (req, res) => {
  const query = parseQuery(req.query);
  const data = await ReturnOrder.find({
    ...query.filter,
    merchant: req.user.id,
  })
    .lean()
    .skip(query.offset)
    .limit(query.limit)
    .select('orderId status');

  res.json(
    data.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      docketNo: item.docketNo,
      estimatedDeliveryDate: item.estimatedDeliveryDate,
      createdAt: item.createdAt,
      status: item.status,
    }))
  );
};

export const getReturnOrderById = async (req, res) => {
  const data = await ReturnOrder.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  }).lean({ getters: true });

  if (!data)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);

  res.json({
    id: data.id,
    orderId: data.orderId,
    address: data.shipFrom,
    estimatedDeliveryDate: data.estimatedDeliveryDate,
    items: data.items.map((product) => ({
      id: product.product,
      title: product.title,
      image: product.image,
      quantity: product.quantity,
      purity: product.purity,
      rate: product.rate,
      weight: product.weight,
      makingCharge: product.makingCharge,
      tax: product.tax,
      taxAmount: product.taxAmount,
      subtotal: product.totalAmount,
      returnedReason: product.returnedReason,
      rejectedReason: product.rejectedReason ?? '',
      status: product.status,
    })),
    status: data.status,
  });
};

export const getVerifierOverview = async (req, res) => {
  const [appointments, verifications, shipping] = await Promise.all([
    Appointment.aggregate()
      .match({ merchant: stringToObjectId(req.user.id) })
      .group({
        _id: {
          status: '$status',
          stage: '$cancelledStage',
        },
        count: { $sum: 1 },
      }),
    VerifiedGold.aggregate()
      .match({ merchant: stringToObjectId(req.user.id) })
      .group({ _id: '$status', count: { $sum: 1 } }),
    GoldBox.aggregate()
      .match({ 'verifier.merchant': stringToObjectId(req.user.id) })
      .group({ _id: '$status', count: { $sum: 1 } }),
  ]);

  const appointment = appointments.reduce(
    (prev, item) => {
      switch (item._id.status) {
        case 'requested':
          prev.active += item.count;
          break;
        case 'reschedule_requested':
          prev.rescheduled += item.count;
          break;
        case 'booked':
          prev.scheduled += item.count;
          break;
        case 'cancelled':
          switch (item._id.stage) {
            case 'before_verification':
              prev.beforeVerification += item.count;
              break;
            case 'before_melting':
              prev.beforeMelting += item.count;
              break;
            case 'after_melting':
              prev.afterMelting += item.count;
              break;
          }
      }

      return prev;
    },
    {
      active: 0,
      scheduled: 0,
      rescheduled: 0,
      beforeVerification: 0,
      beforeMelting: 0,
      afterMelting: 0,
    }
  );

  const verification = verifications.reduce(
    (prev, item) => {
      switch (item._id) {
        case 'placed':
          prev.pending += item.count;
          break;
        case 'assigned':
          prev.needToStart += item.count;
          break;
        case 'started':
          prev.started += item.count;
          break;
        case 'reached':
          prev.reached += item.count;
          break;
        case 'verified':
          prev.completed += item.count;
          break;
        case 'submitted':
          prev.scanAndCheck += item.count;
          break;
        case 'checked':
          prev.packBags += item.count;
          break;
      }

      return prev;
    },
    {
      needToStart: 0,
      started: 0,
      reached: 0,
      pending: 0,
      completed: 0,
      scanAndCheck: 0,
      packBags: 0,
    }
  );

  const ship = shipping.reduce(
    (prev, item) => {
      switch (item.status) {
        case 'packed':
          prev.assigned += item.count;
          break;
        case 'shipped':
          prev.inTransit += item.count;
          break;
        case 'delivered':
          prev.delivered += item.count;
          break;
      }

      return prev;
    },
    {
      assigned: 0,
      inTransit: 0,
      delivered: 0,
    }
  );

  res.json({
    appointments: {
      active: appointment.active,
      scheduled: appointment.scheduled,
      rescheduled: appointment.rescheduled,
    },
    vehicleTracking: {
      needToStart: verification.needToStart,
      started: verification.started,
      reached: verification.reached,
    },
    verifications: {
      pending: verification.pending,
      completed: verification.completed,
    },
    cancellations: {
      beforeVerification: appointment.beforeVerification,
      beforeMelting: appointment.beforeMelting,
      afterMelting: appointment.afterMelting,
    },
    received: {
      scanAndCheck: verification.scanAndCheck,
      packBags: verification.packBags,
    },
    shipping: ship,
  });
};

export const getVerifierOrders = async (req, res) => {
  const query = parseQuery(req.query);
  const data = await OldGoldRequest.find({
    ...query.filter,
    'verifier.merchant': req.user.id,
  })
    .lean()
    .select('orderId status')
    .skip(query.offset)
    .limit(query.limit);

  res.json(data);
};

export const getVerifierOrderById = async (req, res) => {
  const data = await OldGoldRequest.findOne({
    _id: req.params.id,
    'verifier.merchant': req.user.id,
  })
    .lean()
    .populate('user')
    .populate('verifier.manager')
    .populate('verifier.captain')
    .populate('verifier.vehicle')
    .populate('verifier.securityGuards')
    .populate('verifier.securityBag')
    .populate('items.styles.style')
    .populate('verifier.box')
    .transform(
      (item) =>
        item && {
          id: item._id,
          orderId: item.orderId,
          fullName: item.user.fullName,
          address: item.address,
          initial: {
            weight: 10,
            purity: 99,
          },
          appointmentDetails: {
            dateTime: item.appointedDate,
            manager: item.verifier.manager.fullName,
            captain: item.verifier.captain.fullName,
            vehicle: item.verifier.vehicle.number,
            securityGuards: item.verifier.securityGuards?.map(
              (e) => e.fullName
            ),
            status: 'Started',
          },
          verificationDetails: {
            items: item.items.map((e) => ({
              grossWeight: e.grossWeight,
              grossPurity: e.purity,
              styles: e.styles.map((x) => ({
                style: x.style?.name,
                rateAppliedOn: x.amountAppliedOn,
                pieceCount: x.pieceCount,
                weight: x.weight,
                rate: x.rate,
              })),
            })),
            netWeight: 14,
            netPurity: 91.6,
          },
          meltedDetails: {
            netWeight: item.verifier.captainProcess.netWeight,
            netPurity: item.verifier.captainProcess.purity,
            customerDecision: item.type,
            sellRate: item.sellRate,
            bookingAmount: item.amountPaid,
            totalPayableAmount:
              item.sellRate *
              item.verifier.captainProcess.netWeight *
              (item.verifier.captainProcess.purity / 100),
          },
          bagDetails: {
            serialNumber: item.verifier.securityBag?.serialNumber,
            weight: item.verifier.managerProcess.sealedBagWeight,
            handedOverToManager: ['submitted', 'ready'].includes(
              item.verifier.status
            ),
          },
          refinerDetails: null,
          box: item.verifier.box,
          status: item.status,
        }
    );

  if (!data)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);

  const box = data.box;

  if (box) {
    data.refinerDetails = {
      id: box._id,
      orderId: box.orderId,
      weight: data.bagDetails.weight,
      estimatedDeliveryDate: box.estimatedDeliveryDate || '',
      agentName: box.agentName,
      address: 'Malbaar jewellers',
    };
  }

  delete data.box;

  res.json(data);
};

export const getRefinerOverview = async (req, res) => {
  const data = await Promise.all([
    GoldBox.aggregate()
      .match({ 'refiner.merchant': stringToObjectId(req.user.id) })
      .group({ _id: '$status', count: { $sum: 1 } }),
    Dispute.countDocuments({
      merchant: req.user.id,
    }),
    Gold.aggregate()
      .match({
        merchant: stringToObjectId(req.user.id),
        type: 'bar',
        status: { $in: ['added', 'checked'] },
      })
      .group({ _id: null, count: { $sum: 1 }, weight: { $sum: '$weight' } }),
  ]);

  const toBeRefined = data[0].reduce(
    (prev, item) => {
      switch (item._id) {
        case 'shipped':
          prev.inTransit += item.count;
          break;
        case 'delivered':
          prev.received += item.count;
          break;
        case 'assigned':
          prev.assigned += item.count;
          break;
      }

      return prev;
    },
    { inTransit: 0, received: 0, assigned: 0 }
  );

  res.json({
    toBeRefined,
    refiningProcess: {
      purityCheck: toBeRefined.assigned,
      disputeCount: data[1],
      barCount: data[2][0]?.count ?? 0,
      weight: data[2][0]?.weight ?? 0,
    },
  });
};

export const getRefinerOrders = async (req, res) => {
  const query = parseQuery(req.query);
  const data = await VerifiedBox.find({
    ...query.filter,
    'refiner.merchant': req.user.id,
  })
    .lean()
    .select('orderId status')
    .skip(query.offset)
    .limit(query.limit);

  res.json(data);
};

export const getRefinerOrderById = async (req, res) => {
  const items = await VerifiedBox.find({ box: req.params.id });
  const data = await RefinedBox.findOne({
    _id: req.params.id,
    'refiner.merchant': req.user.id,
  })
    .lean()
    .populate('refiner.merchant')
    .populate('refiner.manager')
    .populate('refiner.captain')
    .transform(
      (item) =>
        item && {
          id: item._id,
          orderId: item.orderId,
          fullName: item.verifier.merchant.name,
          address: item.verifier.merchant.address,
          initialDetails: {
            weight: item.verifier.bagWeight,
            estimatedDeliveryDate: item.estimatedDeliveryDate,
            agentName: item.agentName,
            managerName: item.refiner.manager?.fullName ?? '',
            captainName: item.refiner.captain?.fullName ?? '',
          },
          refiningDetails: {
            items: items.map((e) => ({
              weight: e.refiner.netWeight,
              purity: e.refiner.purity,
              bagWeight: 10,
            })),
          },
          refinedDetails: {
            netWeight: item.refiner.netWeight,
            netPurity: item.refiner.purity,
            difference: 1.5,
          },
          box: item.box,
          merchant: item.merchant,
          bagDetails: null,
          merchant: null,
          status: item.status,
        }
    );

  if (!data)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);

  const box = data.box;

  if (box) {
    data.bagDetails = {
      serialNumber: box.securityBag?.serialNumber || '',
      weight: 400,
      handedOverToManager: true,
    };

    data.merchant = {
      id: box.id,
      orderId: data.orderId,
      status: data.status,
      weight: 400,
      estimatedDeliveryDate: box.estimatedDeliveryDate,
      agentName: box.agentName,
      name: data.merchant?.name,
      address: data.merchant?.address,
    };
  }

  delete data.box;
  delete data.merchant;

  res.json(data);
};
