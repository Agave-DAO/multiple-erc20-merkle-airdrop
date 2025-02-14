import config from "config"; // Airdrop config
import { eth } from "state/eth"; // ETH state provider
import { ethers } from "ethers"; // Ethers
import keccak256 from "keccak256"; // Keccak256 hashing
import MerkleTree from "merkletreejs"; // MerkleTree.js
import { useEffect, useState } from "react"; // React
import { createContainer } from "unstated-next"; // State management
import { useRouter } from 'next/router';


/**
 * Generate Merkle Tree leaf from address and value
 * @param {string} address of airdrop claimee
 * @param {string} value of airdrop tokens to claimee
 * @returns {Buffer} Merkle Tree node
 */
function generateLeaf(address: string, value: string): Buffer {
  return Buffer.from(
    // Hash in appropriate Merkle format
    ethers.utils
      .solidityKeccak256(["address", "uint256"], [address, value])
      .slice(2),
    "hex"
  );
}

// Setup merkle tree
function merkleTree(index:number){
  const tree = new MerkleTree(
  // Generate leafs
  Object.entries(config[index].addresses).map(([address, tokens]) =>
    generateLeaf(
      ethers.utils.getAddress(address),
      ethers.utils.parseUnits(tokens, 0).toString()
    )
  ),
  // Hashing function
  keccak256,
  { sortPairs: true }
)
return tree};

function useToken() {
  // Collect global ETH state
  const {
    address,
    provider,
  }: {
    address: string | null;
    provider: ethers.providers.Web3Provider | null;
  } = eth.useContainer();

  const router = useRouter()
  // Global ETH state

  // Local state
  const [dataLoading, setDataLoading] = useState<boolean>(true); // Data retrieval status
  const [numTokens, setNumTokens] = useState<string>("0"); // Number of claimable tokens
  const [numTokensInWei, setNumTokensInWei] = useState<string>("0"); // Number of claimable tokens
  const [alreadyClaimed, setAlreadyClaimed] = useState<boolean>(false); // Claim status
  const [index, setIndex] = useState<number>(0); // index

  /**
   * Get contract
   * @param {string} address to check
   * @returns {ethers.Contract} signer-initialized contract
   */
  const getContract = (merkleContract: string): ethers.Contract => {
    return new ethers.Contract(
      // Contract address
      merkleContract,
      [
        // hasClaimed mapping
        "function hasClaimed(address token, address user) public view returns (bool)",
        // Claim function
        "function claim(address token, address to, uint256 amount, bytes32[] calldata proof) external",
      ],
      // Get signer from authed provider
      provider?.getSigner()
    );
  };

  /**
   * Collects number of tokens claimable by a user from Merkle tree
   * @param {string} address to check
   * @returns {string} of tokens claimable
   */
  const getAirdropAmount = (address: string,index:number ): string => {
    // If address is in airdrop. convert address to correct checksum
    address = ethers.utils.getAddress(address)
    if (address in config[index].addresses) {
      // Return number of tokens available
      return config[index].addresses[address];
    }
    address = address.toLowerCase()
    if (address in config[index].addresses) {
      // Return number of tokens available
      return config[index].addresses[address];
    }
    // Else, return 0 tokens
    return "0";
  };

  /**
   * Collects claim status for an address
   * @param {string} address to check
   * @returns {Promise<boolean>} true if already claimed, false if available
   */
  const getClaimedStatus = async (address: string): Promise<boolean> => {
    // Collect token contract
    address = ethers.utils.getAddress(address); 
    const merkleContract1: ethers.Contract = getContract(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS1 ?? "");
    const merkleContract2: ethers.Contract = getContract(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS2 ?? "");
    
    // Return claimed status
    let assetToClaim:string = config[index].token
    let assetToClaim1 = assetToClaim
    if (assetToClaim === "0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2"){
      assetToClaim1 = "0xa286Ce70FB3a6269676c8d99BD9860DE212252Ef";
    }
    
    let hasClaimedOut1 = await merkleContract1.hasClaimed(assetToClaim1, address)
    let hasClaimedOut2 = await merkleContract2.hasClaimed(assetToClaim, address)
    return (hasClaimedOut1 && hasClaimedOut2);
  };

  const claimAirdrop = async (claimId:number): Promise<void> => {
    // If not authenticated throw
    setIndex(claimId)
    let assetToClaim:string = config[index].token
    if (!address) {
      throw new Error("Not Authenticated");
    }

    // Collect token contract
    const merkleContract1: ethers.Contract = getContract(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS1 ?? "");
    const merkleContract2: ethers.Contract = getContract(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS2 ?? "");
    // Get properly formatted address
    const formattedAddress: string = ethers.utils.getAddress(address);
    // Get tokens for address
    const numTokensInWei: string = (config[index].addresses[formattedAddress]) ? config[index].addresses[formattedAddress] : config[index].addresses[formattedAddress.toLowerCase()]
      
    // Generate hashed leaf from address
    const leaf: Buffer = generateLeaf(formattedAddress, numTokensInWei);
    // Generate airdrop proof
    const proof: string[] = merkleTree(index).getHexProof(leaf);

    let hasClaimedOut1 = await merkleContract1.hasClaimed(assetToClaim, address)
    let hasClaimedOut2 = await merkleContract2.hasClaimed(assetToClaim, address)
    if (!hasClaimedOut1){
    // Try to claim airdrop and refresh sync status
    try {
      let asset = assetToClaim;
      if (assetToClaim === "0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2"){
        asset = "0xa286Ce70FB3a6269676c8d99BD9860DE212252Ef";
      }
      console.log(`contract:${merkleContract1.address}\nasset:${asset}\nuser: ${formattedAddress}\namount: ${numTokensInWei}\nproof: ${proof}`);
      const tx = await merkleContract1.claim(asset, formattedAddress, numTokensInWei, proof);
      await tx.wait(1);
      await syncStatus();
    } catch (e) {
      console.error(`Error when claiming tokens: ${e}`);
    }
  }
  if (!hasClaimedOut2){
    try {
      console.log(`contract:${merkleContract2.address}\nasset:${assetToClaim}\nuser: ${formattedAddress}\namount: ${numTokensInWei}\nproof: ${proof}`);
      const tx = await merkleContract2.claim(assetToClaim, formattedAddress, numTokensInWei, proof);
      await tx.wait(1);
      await syncStatus();
    } catch (e) {
      console.error(`Error when claiming tokens: ${e}`);
    }
  }
  };

  /**
   * After authentication, update number of tokens to claim + claim status
   */
  const syncStatus = async (): Promise<void> => {
    // Toggle loading
    setDataLoading(true);
    let claimId = Number(router.query.claimId)
    if (claimId) setIndex(claimId) 
    // Force authentication
    if (address) {
      // Collect number of tokens for address
      let tokensInWei = getAirdropAmount(address, index);
      let tokens = ethers.FixedNumber.fromValue(ethers.BigNumber.from(tokensInWei) ,config[index].decimals).toString();

      setNumTokens(tokens);
      setNumTokensInWei(tokensInWei);
      
      // Collect claimed status for address, if part of airdrop (tokens > 0)
      if (Number(tokens) > 0) {
        let claimed = await getClaimedStatus(address);
        setAlreadyClaimed(claimed);
      }
    }

    // Toggle loading
    setDataLoading(false);
  };

  // On load:
  useEffect(() => {
    syncStatus();
  }, [address, index]);

  return {
    dataLoading,
    numTokens,
    alreadyClaimed,
    claimAirdrop,
    index
  };
}

// Create unstated-next container
export const token = createContainer(useToken);
