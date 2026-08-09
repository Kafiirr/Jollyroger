/**
 * Cleanverse Live UAT Connectivity & On-Chain Verification Test
 * Run: node scripts/test-cleanverse.js [walletAddress]
 */

const crypto = require("crypto");
const https = require("https");

const BASE_URL = "https://uatapi.cleanverse.com/api/cooperate";
const API_ID = "APP20260614112550LIDZXM";
const API_KEY_B64 = "qhfPE24VqLv7wTK7AXMkD4p2i7zKnerg84AtT0IGto0=";
const targetWallet = process.argv[2] || "0x364b4ae518dabd70099ddbc4069ca5510c5fea24";

const key = Buffer.from(API_KEY_B64, "base64");
const iv = Buffer.alloc(16, 0);

function encrypt(data) {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let enc = cipher.update(JSON.stringify(data), "utf8", "base64");
  enc += cipher.final("base64");
  return enc;
}

function requestCleanverse(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-id": API_ID,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }, (res) => {
      let resp = "";
      res.on("data", (chunk) => (resp += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resp) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resp });
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log("=================================================");
  console.log("   CLEANVERSE LIVE PROTOCOL UAT VERIFICATION     ");
  console.log("=================================================");
  console.log(`Endpoint:    ${BASE_URL}`);
  console.log(`Partner App: ${API_ID}`);
  console.log(`Test Wallet: ${targetWallet}`);
  console.log("-------------------------------------------------");

  // 1. Query A-Pass on Monad
  console.log("\n[1/3] Querying Live A-Pass on Monad (/query_apass)...");
  const queryRes = await requestCleanverse("/query_apass", {
    chain: "monad",
    address: targetWallet,
  });

  console.log(`HTTP Status: ${queryRes.status}`);
  console.log("Response:", JSON.stringify(queryRes.data, null, 2));

  if (queryRes.data?.code === "0000" && queryRes.data?.data) {
    console.log("\n✅ LIVE VERIFICATION SUCCESSFUL!");
    console.log(`   - Cleanverse Record ID : ${queryRes.data.data.cvRecordId}`);
    console.log(`   - Compliance Tier      : Tier ${queryRes.data.data.tier} (Sub-tier: ${queryRes.data.data.subTier})`);
    console.log(`   - Origin Countries     : ${queryRes.data.data.countries?.join(", ")}`);
    console.log(`   - KYC Hash             : ${queryRes.data.data.currentKycHash}`);
  } else {
    console.log("\n[2/3] Wallet not yet registered on Monad. Registering live A-Pass (/generate_apass)...");
    const regPayload = {
      customerId: `JR${targetWallet.slice(2, 10).toUpperCase()}${Date.now().toString().slice(-4)}`,
      kycSource: "sumsub",
      kycId: `KYC_${targetWallet.slice(2, 8).toUpperCase()}`,
      subTier: 10,
      subGroup: "JR",
      override: true,
      expirationTime: Math.floor(Date.now() / 1000) + 86400 * 365 * 3,
      wallet: { address: targetWallet, chain: "monad" },
      identityDataList: [
        {
          idType: "PASSPORT",
          fullName: "Jolly Roger Player",
          idNumber: `ID_${targetWallet.slice(2, 10)}`,
          validUntil: "2030-12-31",
          issuingCountryISO2: "US",
        },
      ],
    };

    const enc = encrypt(regPayload);
    const genRes = await requestCleanverse("/generate_apass", { data: enc });
    console.log("Generate Response:", JSON.stringify(genRes.data, null, 2));
  }

  // 3. Query Registry on Monad
  console.log("\n[3/3] Querying Live Monad A-Pass Registry (/query_apass_list)...");
  const listRes = await requestCleanverse("/query_apass_list", {
    page: 1,
    pageSize: 3,
    chain: "monad",
  });
  console.log(`Total Monad A-Passes Registered in UAT: ${listRes.data?.data?.total || 0}`);
  console.log("=================================================\n");
}

runTest().catch(console.error);
