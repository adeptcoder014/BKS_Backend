import joi from 'joi';
import validators from '../../utils/validators.js';

// Delivery
export const reviewDeliveryItem = joi.object({
  quantity: joi.number().required(),
  weight: joi.number().required(),
  weightScaleImage: validators.fileKey().required(),
});

export const notifyDeliveryCaptain = joi.object({
  captain: validators.id().required(),
});

export const assignDeliveryOrder = joi.object({
  captain: validators.id().required(),
  otp: validators.otp().required(),
});

export const packDeliveryOrder = joi.object({
  invoiceImage: validators.fileKey().required(),
  packageImage: validators.fileKey().required(),
});

export const shipDeliveryOrder = joi.object({
  agentName: joi.string().required(),
  agentImage: validators.fileKey().required(),
  agentDocument: validators.fileKey().required(),
});

// Return
export const receiveReturnOrder = joi.object({
  agentName: joi.string().required(),
  agentImage: validators.fileKey().required(),
  agentDocument: validators.fileKey().required(),
  packageImage: validators.fileKey().required(),
});

export const notifyReturnCaptain = joi.object({
  captain: validators.id().required(),
  ids: joi.array().items(validators.id()).min(1).required(),
});

export const assignReturnCaptain = joi.object({
  captain: validators.id().required(),
  ids: joi.array().items(validators.id()).min(1).required(),
});

export const recheckReturnOrderItem = joi.object({
  checkingVideo: validators.fileKey().required(),
  status: joi.string().valid('accepted', 'rejected').required(),
  rejectedReason: joi.string().when('status', {
    is: 'rejected',
    then: joi.required(),
    otherwise: joi.optional(),
  }),
});

export const processReturnOrder = joi.object({});

// Verifier
export const acceptVerifierAppointment = joi.object({});

export const rescheduleVerifierAppointment = joi.object({
  date: joi.string().required(),
  time: joi.string().required(),
});

export const notifyVerifierCaptain = joi.object({
  ids: joi.array().items(validators.id()).required().min(1),
  captain: validators.id().required(),
});

export const assignVerifierCaptain = joi.object({
  ids: joi.array().items(validators.id()).required().min(1),
  captain: validators.id().required(),
  otp: validators.otp().required(),
});

export const sendToVerifierWarehouse = joi.object({
  qrCode: joi.string().required(),
  weight: joi.number().required(),
  image: validators.fileKey().required(),
});

export const recheckVerifiedBag = joi.object({
  qrCode: joi.string().required(),
  actualWeight: joi.number().required(),
  actualWeightScaleImage: validators.fileKey().required(),
  openingVideo: validators.fileKey().required(),
  purityCheckingVideo: validators.fileKey().required(),
  purityScaleImage: validators.fileKey().required(),
  bagQrCode: joi.string().required(),
  bagWeight: joi.number().required(),
  bagWeightScaleImage: validators.fileKey().required(),
  purity: joi.number().required(),
});

export const packVerifiedBags = joi.object({
  ids: joi.string().required(),
  qrCode: joi.string().required(),
  weight: joi.number().required(),
  image: validators.fileKey().required(),
});

export const shipVerifiedBox = joi.object({
  agentName: joi.string().required(),
  agentImage: validators.fileKey().required(),
  agentDocument: validators.fileKey().required(),
});

// Refiner
export const receiveRefinerOrder = joi.object({
  agentName: joi.string().required(),
  agentImage: validators.fileKey().required(),
  agentDocument: validators.fileKey().required(),
  packageImage: validators.fileKey().required(),
});

export const notifyRefinerCaptain = joi.object({
  ids: joi.array().items(validators.id()).required().min(1),
  captain: validators.id().required(),
});

export const assignRefinerCaptain = joi.object({
  ids: joi.array().items(validators.id()).required().min(1),
  captain: validators.id().required(),
  otp: validators.otp().required(),
});

export const checkRefinedOrder = joi.object({
  items: joi.array().items(
    joi
      .object({
        id: joi.string().required(),
        weight: joi.number().required(),
        purity: joi.number().required(),
      })
      .required()
  ),
});

export const packBars = joi.object({
  ids: joi.string().required(),
  weight: joi.number().required(),
  image: validators.fileKey().required(),
});

export const shipBox = joi.object({
  agentName: joi.string().required(),
  agentImage: validators.fileKey().required(),
  agentDocument: validators.fileKey().required(),
});

// Custodian
export const receiveCustodianOrder = joi.object({
  agentName: joi.string(),
  agentImage: validators.fileKey().required(),
  agentDocument: validators.fileKey().required(),
  packageImage: validators.fileKey().required(),
});

export const scanAndCheckOrder = joi.object({
  qrCode: joi.string(),
  openingVideo: validators.fileKey().required(),
});

export const checkBar = joi.object({
  id: joi.string().required(),
  weight: joi.number().required(),
  purity: joi.number().required(),
  weightScaleImage: validators.fileKey().required(),
  purityScaleImage: validators.fileKey().required(),
});

export const submitCustodianOrder = joi.object({
  raiseDispute: joi.boolean(),
});
