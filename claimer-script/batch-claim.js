import dotenv from "dotenv";
import { getUserHasClaimed, claim, isEOA } from "./web3.js";
import config5 from "./config.js"; // Distribution config
import config80 from "./config-80%.js"; // Distribution config
import { MerkleTree } from "merkletreejs";
import { ethers } from "ethers"; // Ethers
import keccak256 from "keccak256"; // Keccak256 hashing
import { isAddress } from "viem";

dotenv.config();

const assetSymbols = config.map((asset) => asset.symbol);
const MerkleContract0 = "0xB77d3295f5D62328C403043E3a6f0baB125A465b";
const MerkleContract1 = "0xc21a7B1e58356892F606beE801A00C7bAD72edF7";
const MerkleContract2 = "0x6Ce74a957a7520Affdf07FBc3b5563F8b81CCaCC";
const MerkleContract3 = "0xb88d66e7721a20b58E7d18D81cdB9682307399bA";
const targetContracts = [MerkleContract0, MerkleContract1, MerkleContract2, MerkleContract3];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate Merkle Tree leaf from address and value
 * @param {string} address of airdrop claimee
 * @param {string} value of airdrop tokens to claimee
 * @returns {Buffer} Merkle Tree node
 */
function generateLeaf(address, value) {
  return Buffer.from(
    // Hash in appropriate Merkle format
    ethers.utils
      .solidityKeccak256(["address", "uint256"], [address, value])
      .slice(2),
    "hex"
  );
}

// Setup merkle tree
function merkleTree(data) {
  const tree = new MerkleTree(
    // Generate leafs
    Object.entries(data.addresses).map(([address, numTokens]) =>
      generateLeaf(
        ethers.utils.getAddress(address),
        ethers.utils.parseUnits(numTokens, 0).toString()
      )
    ),
    // Hashing function
    keccak256,
    { sortPairs: true }
  );
  return tree;
}

async function findUserClaimedAssets(distData, targetContract, user) {
  let claimedAssets = [];
  for (let i = 0; i < assetSymbols.length; i++) {
    let token = distData.token;
    if (
      token === "0xa286Ce70FB3a6269676c8d99BD9860DE212252Ef" &&
      targetContract !== MerkleContract0 && targetContract !== MerkleContract1
    ) {
      token = "0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2";
    }
    const hasClaimed = await getUserHasClaimed(targetContract, token, user);
    if (hasClaimed) claimedAssets.push(i);
  }
  return claimedAssets;
}

function findUserProofForAsset(distData, user, wei) {
  const leaf = generateLeaf(user, wei);
  return merkleTree(distData).getHexProof(leaf);
}

async function claimOnBehalfOfUsers() {
  for (let i = 0; i < assetSymbols.length; i++) {
      for (let x = 0; x < targetContracts.length; x++) {
        const distData = (targetContracts[x] === MerkleContract0) ? config80[i] : config5[i];
        for (const [user, wei] of Object.entries(distData.addresses)) {
        const claimedAssets = await findUserClaimedAssets(
          distData,
          targetContracts[x],
          user
        );
        //     console.log(config[i].symbol, user, claimedAssets.includes(i), wei);
        if (!claimedAssets.includes(i)) {
          const proof = findUserProofForAsset(distData, user, wei);
          let token = distData.token;
          if (
            token === "0xa286Ce70FB3a6269676c8d99BD9860DE212252Ef" &&
            targetContracts[x] !== MerkleContract0 && targetContracts[x] !== MerkleContract1
          ) {
            token = "0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2";
          }
          const txdata = await claim(
            targetContracts[x],
            token,
            user,
            wei,
            proof
          );
          console.log(txdata);
        }
      }
    }
  }
}
claimOnBehalfOfUsers();
