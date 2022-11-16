import mongoose from 'mongoose';
import { Gateway as FabricGateway, Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import { resolve } from 'path';

import logger from '../utils/logger.js';
import {
  buildCAClient,
  registerAndEnrollUser,
  enrollAdmin,
  buildCCP,
  buildWallet,
} from '../utils/fabric.js';
import { fileURLToPath } from 'url';
import { generateUniqueId } from '../utils/util.js';

const channelName = 'goldchannel';
const chaincodeName = 'iac';
const mspId = 'Org1MSP';
const walletPath = resolve('./config/wallet');
const caHostName = 'ca.org1.example.com';
const appUserId = 'appUser2';
const gateway = new FabricGateway();

let contract;

export const evaluateTransaction = async (transactionName, ...args) => {
  console.log('Evaluate Transaction\n', ...args);
  const result = await contract.evaluateTransaction(transactionName, ...args);
  return JSON.parse(result.toString());
};

export const submitTransaction = async (transactionName, ...args) => {
  logger.info(
    `\n--> Submit Transaction: ${transactionName} with args: \n${JSON.stringify(
      args[0],
      null,
      2
    )}}`
  );
  const result = await contract.submitTransaction(transactionName, ...args);
  return JSON.parse(result.toString());
};

export const deleteTransaction = async (id) => {
  logger.info(`\n--> Delete Transaction: DeleteAsset with args ${id}`);
  const result = await contract.submitTransaction('DeleteAsset', `${id}`);
  logger.info(`Result: ${result}`);

  return `{"transactionId": ${result}}`;
};

const getContract = async () => {
  try {
    // build an in memory object with the network configuration (also known as a connection profile)
    const ccp = buildCCP();

    // build an instance of the fabric ca services client based on
    // the information in the network configuration
    const caClient = buildCAClient(FabricCAServices, ccp, caHostName);

    // setup the wallet to hold the credentials of the application user
    const wallet = await buildWallet(Wallets, walletPath);

    // in a real application this would be done on an administrative flow, and only once
    await enrollAdmin(caClient, wallet, mspId);

    // in a real application this would be done only when a new user was required to be added
    // and would be part of an administrative flow
    await registerAndEnrollUser(
      caClient,
      wallet,
      mspId,
      appUserId,
      'org1.department1'
    );

    // Create a new gateway instance for interacting with the fabric network.
    // In a real application this would be done as the backend server session is setup for
    // a user that has been verified.
    const gateway = new FabricGateway();

    // setup the gateway instance
    // The user will now be able to create connections to the fabric network and be able to
    // submit transactions and query. All transactions submitted by this gateway will be
    // signed by this user using the credentials stored in the wallet.
    await gateway.connect(ccp, {
      wallet,
      identity: appUserId,
      discovery: {
        enabled: true,
        asLocalhost: false,
      }, // using asLocalhost as this gateway is using a fabric network deployed locally
    });

    // Build a network instance based on the channel where the smart contract is deployed
    const network = await gateway.getNetwork(channelName);

    // Get the contract from the network.
    const contract = network.getContract(chaincodeName);
    return [contract, gateway];
  } catch (error) {
    logger.error(`******** FAILED to create contract instance: ${error}`);
  }
};

export const connectToFabric = async () => {
  const ccp = buildCCP();
  const wallet = await buildWallet(Wallets, walletPath);

  await gateway.connect(ccp, {
    wallet,
    identity: appUserId,
    discovery: {
      enabled: true,
      asLocalhost: false,
    },
  });

  const network = await gateway.getNetwork(channelName);

  contract = network.getContract(chaincodeName);
  logger.info('Connected to Fabric Network');
  return gateway;
};

export const find = (filter) => {
  return evaluateTransaction('Find', JSON.stringify(filter), filter.docType);
};

export const findOne = async (filter) => {
  const data = await evaluateTransaction(
    'Find',
    JSON.stringify(filter),
    filter.docType
  );
  return data?.[0] || null;
};

export const create = async (data) => {
  const payload = {
    id: generateUniqueId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  };
  await submitTransaction('CreateData', JSON.stringify(payload));

  return payload;
};

export const updateOne = async (filter, update) => {
  const data = await findOne(filter);
  if (!data) return null;
  Object.assign(data, { updatedAt: new Date() }, update);

  await submitTransaction('UpdateData', data);

  return data;
};

export const deleteOne = (id) => {
  return deleteTransaction(id);
};

const Gateway = {
  create,
  find,
  findOne,
  updateOne,
  deleteOne,
  evaluateTransaction,
  submitTransaction,
};

export default Gateway;
