import { eth } from "state/eth"; // Global state: ETH
import { useState } from "react"; // State management
import { token } from "state/token"; // Global state: Tokens
import Layout from "components/Layout"; // Layout wrapper
import styles from "styles/pages/Claim.module.scss"; // Page styles
import { useRouter } from 'next/router';
import config from "config"; // Airdrop config
import { ethers } from "ethers"; // Ethers

const bn = ethers.BigNumber;

export default function Claim() {
  const router = useRouter()
  // Global ETH state
  let claimId: number = Number(router.query.claimId)
  const { address, unlock }: { address: string | null; unlock: Function } =
    eth.useContainer();
  // Global token state
  const {
    dataLoading,
    numTokens,
    alreadyClaimed,
    claimAirdrop,
  }: {
    dataLoading: boolean;
    numTokens: string;
    alreadyClaimed: boolean;
    claimAirdrop: Function;
  } = token.useContainer();
  // Local button loading

  const [buttonLoading, setButtonLoading] = useState<boolean>(false);
  const [index, setIndex] = useState<number>(0);
  /**
   * Claims airdrop with local button loading
   */
  const claimWithLoading = async () => {
    setButtonLoading(true); // Toggle
    await claimAirdrop(index); // Claim
    setButtonLoading(false); // Toggle
  };

  return (
    <Layout key={router.asPath}>
      <div className={styles.claim}>
        {!address ? (
          // Not authenticated
          <div className={styles.card}>
            <h1>You are not authenticated.</h1>
            <p>Please connect with your wallet to check your airdrop.</p>
            <button onClick={() => unlock()}>Connect Wallet</button>
          </div>
        ) : dataLoading ? (
          // Loading details about address
          <div className={styles.card}>
            <h1>Loading airdrop details...</h1>
            <p>Please hold while we collect details about your address.</p>
          </div>
        ) : numTokens == "0" ? (
          // Not part of airdrop
          <div className={styles.card}>
            <h1>You do not qualify.</h1>
            <p>Unfortunately, your address does not qualify for the airdrop.</p>
          </div>
        ) : alreadyClaimed ? (
          // Already claimed airdrop
          <div className={styles.card}>
            <h1>Already claimed.</h1>
            <p>
              Your address ({address}) has already claimed {numTokens} tokens.
            </p>
          </div>
        ) : (
          // Claim your airdrop
          <div className={styles.card}>
            <h1>Claim your airdrop.</h1>
            <p>Your address qualifies for {numTokens} {config[claimId].symbol}.</p>
            <button onClick={claimWithLoading} disabled={buttonLoading}>
              {buttonLoading ? "Claiming Airdrop..." : "Claim Airdrop"}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
