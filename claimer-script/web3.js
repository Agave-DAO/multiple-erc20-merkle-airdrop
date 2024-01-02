import ethers from "ethers";
import { MerkleClaim } from "./abis/MerkleClaimERC20.js";
import { ERC20 } from "./abis/ERC20.js";
import { gnosis, gnosisChiado } from "viem/chains";
import { createPublicClient, createWalletClient, custom, http, parseGwei } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

// config.js
import dotenv from "dotenv";
dotenv.config();

const account = privateKeyToAccount(process.env.PRIVATE_KEY) || mnemonicToAccount(process.env.MNEMONIC);
const transport = http(process.env.RPC_URL);

export const client = createPublicClient({
  chain: gnosis,
  transport,
});

export const wallet = createWalletClient({
  account,
  chain: gnosis,
  transport,
});


export const [address] = await wallet.getAddresses();

const priorityFee = 1011000000n;
const gasFee = 10901000000n;

export async function getUserHasClaimed(target, tokenAddress, userAddress) {
  return client.readContract({
    address: target,
    abi: MerkleClaim,
    functionName: "hasClaimed",
    args: [tokenAddress, userAddress],
  });
}

export async function claim(target, tokenAddress, userAddress, amount, proof) {
  const tx = await wallet.writeContract({
    address: target,
    abi: MerkleClaim,
    functionName: "claim",
    args: [tokenAddress, userAddress, amount, proof],
    gas: 600_000n,
  });
 // await client.waitForTransactionReceipt({ confirmations:1, hash: tx });
  return "https://gnosisscan.io/tx/"+tx;  
}

export async function isEOA(addy) {
  return client.getBytecode({
    address: addy,
  });
}
