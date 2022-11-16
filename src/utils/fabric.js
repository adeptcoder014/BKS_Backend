import fs from 'fs';
import path from 'path';
import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import logger from './logger.js';

const adminUserId = 'admin';
const adminUserPasswd = 'adminpw';

// let adminUserId;
// let adminUserPasswd;

/**
 *
 * @param {*} FabricCAServices
 * @param {*} ccp
 */
export const buildCAClient = (FabricCAServices, ccp, caHostName) => {
  // Create a new CA client for interacting with the CA.
  const caInfo = ccp.certificateAuthorities[caHostName]; //lookup CA details from config
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  const caClient = new FabricCAServices(
    caInfo.url,
    { trustedRoots: caTLSCACerts, verify: false },
    caInfo.caName
  );

  console.log(`Built a CA Client named ${caInfo.caName}`);
  return caClient;
};

export const enrollAdmin = async (caClient, wallet, orgMspId) => {
  try {
    // if(orgMspId == "ORG1MSP"){
    // 	adminUserId = hdfcadminUserId;
    // 	adminUserPasswd = hdfcadminUserPasswd;
    // }else if(orgMspId == "SBILIFEMSP") {
    // 	adminUserId = sbiadminUserId;
    // 	adminUserPasswd = sbiadminUserPasswd;
    // }
    // Check to see if we've already enrolled the admin user.
    const identity = await wallet.get(adminUserId);
    if (identity) {
      console.log(
        'An identity for the admin user already exists in the wallet'
      );
      return;
    }

    // Enroll the admin user, and import the new identity into the wallet.
    const enrollment = await caClient.enroll({
      enrollmentID: adminUserId,
      enrollmentSecret: adminUserPasswd,
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: 'X.509',
    };
    await wallet.put(adminUserId, x509Identity);
    console.log(
      'Successfully enrolled admin user and imported it into the wallet'
    );
  } catch (error) {
    console.error(`Failed to enroll admin user : ${error}`);
  }
};

export const registerAndEnrollUser = async (
  caClient,
  wallet,
  orgMspId,
  userId
) => {
  try {
    // if(orgMspId == "HDFCLIFEMSP"){
    // 	adminUserId = hdfcadminUserId;
    // 	adminUserPasswd = hdfcadminUserPasswd;
    // }else if(orgMspId == "SBILIFEMSP") {
    // 	adminUserId = sbiadminUserId;
    // 	adminUserPasswd = sbiadminUserPasswd;
    // }
    // Check to see if we've already enrolled the user
    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      console.log(
        `An identity for the user ${userId} already exists in the wallet`
      );
      return;
    }

    // Must use an admin to register a new user
    const adminIdentity = await wallet.get(adminUserId);
    if (!adminIdentity) {
      console.log(
        'An identity for the admin user does not exist in the wallet'
      );
      console.log('Enroll the admin user before retrying');
      return;
    }

    // build a user object for authenticating with the CA
    const provider = wallet
      .getProviderRegistry()
      .getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
    // Register the user, enroll the user, and import the new identity into the wallet.
    // if affiliation is specified by client, the affiliation value must be configured in CA
    const secret = await caClient.register(
      {
        affiliation: 'org1.department1',
        enrollmentID: userId,
        role: 'client',
      },
      adminUser
    );
    const enrollment = await caClient.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: 'X.509',
    };
    await wallet.put(userId, x509Identity);
    console.log(
      `Successfully registered and enrolled user ${userId} and imported it into the wallet`
    );
  } catch (error) {
    console.error(`Failed to register user : ${error}`);
  }
};

export const buildCCP = () => {
  // load the common connection configuration file
  //const ccpPath = path.resolve(__dirname, '..','..','BKS_HLF_network','gold-network','organizations','peerOrganizations','org1.example.com','connection-org1.json');
  const ccpPath = path.resolve('./config/certs/connection-org1.json');
  const fileExists = fs.existsSync(ccpPath);
  if (!fileExists) {
    throw new Error(`no such file or directory: ${ccpPath}`);
  }
  const contents = fs.readFileSync(ccpPath, 'utf8');

  // build a JSON object from the file contents
  const ccp = JSON.parse(contents);

  logger.info(`Loaded the network configuration located at ${ccpPath}`);
  return ccp;
};

// exports.buildCCPSBI = () => {
// 	// load the common connection configuration file
// 	const ccpPath = path.resolve(__dirname, '..', '..', 'ins-network',
// 		'organizations', 'peerOrganizations', 'sbilife.example.com', 'connection-sbilife.json');
// 	const fileExists = fs.existsSync(ccpPath);S
// 	if (!fileExists) {
// 		throw new Error(`no such file or directory: ${ccpPath}`);
// 	}
// 	const contents = fs.readFileSync(ccpPath, 'utf8');

// 	// build a JSON object from the file contents
// 	const ccp = JSON.parse(contents);

// 	console.log(`Loaded the network configuration located at ${ccpPath}`);
// 	return ccp;
// };

export const buildWallet = async (Wallets, walletPath) => {
  // Create a new  wallet : Note that wallet is for managing identities.
  let wallet;
  if (walletPath) {
    wallet = await Wallets.newFileSystemWallet(walletPath);
    logger.info(`Built a file system wallet at ${walletPath}`);
  } else {
    wallet = await Wallets.newInMemoryWallet();
    console.log('Built an in memory wallet');
  }

  return wallet;
};

export const prettyJSONString = (inputString) => {
  if (inputString) {
    return JSON.stringify(JSON.parse(inputString), null, 2);
  } else {
    return inputString;
  }
};

const mspOrg1 = 'Org1MSP';
const walletPath = path.resolve('../wallet');

export async function enrollAppAdmin() {
  let response;
  try {
    // build an in memory object with the network configuration (also known as a connection profile)
    const ccp = buildCCP();

    // build an instance of the fabric ca services client based on
    // the information in the network configuration
    const caClient = buildCAClient(
      FabricCAServices,
      ccp,
      'ca.org1.example.com'
    );

    // setup the wallet to hold the credentials of the application user
    const wallet = await buildWallet(Wallets, walletPath);

    // in a real application this would be done on an administrative flow, and only once
    await enrollAdmin(caClient, wallet, mspOrg1);

    response = { success: true, message: `Enrolled hdfccaadmin successfully` };
  } catch (error) {
    console.error(`******** FAILED to run the application: ${error}`);
    response = { success: false, message: `${error}` };
  }
  return response;
}
