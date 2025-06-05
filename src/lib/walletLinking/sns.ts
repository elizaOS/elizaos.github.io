import { Connection } from "@solana/web3.js";
import { getDomainKeySync, NameRegistryState } from "@bonfida/spl-name-service";

// Array of RPC endpoints to try in order
const RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com", // Public Solana RPC
  "https://solana-mainnet.g.alchemy.com/v2/lqe31XHZcBd-8FsgmYnHJ", // Alchemy endpoint, domain restricted to https://elizaos.github.io
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "", // Local/custom endpoint from environment
];

/**
 * Gets the first working RPC endpoint by testing connectivity
 * @returns Promise<string> The first working RPC endpoint URL
 * @throws Will throw an error if no endpoints are accessible
 */
async function getWorkingRpcEndpoint(): Promise<string> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, "confirmed");
      await connection.getLatestBlockhash(); // Test connectivity
      console.log(`Using RPC endpoint: ${endpoint}`);
      return endpoint;
    } catch (error) {
      console.warn(`Failed to connect to RPC endpoint ${endpoint}:`, error);
      continue; // Try next endpoint
    }
  }

  throw new Error("No working RPC endpoints available");
}

/**
 * Resolves a Solana Name Service (SNS) domain to its owner's public key.
 * @param domain The SNS domain name to resolve (e.g., "alice.sol")
 * @returns A Promise that resolves to the PublicKey of the domain owner
 * @throws Will throw an error if the domain doesn't exist or if there's a network issue
 */
export async function resolveSolDomain(domain: string) {
  try {
    const workingEndpoint = await getWorkingRpcEndpoint();
    const connection = new Connection(workingEndpoint);

    const { pubkey } = getDomainKeySync(domain);

    const { registry } = await NameRegistryState.retrieve(connection, pubkey);
    const owner = registry.owner?.toString();
    return owner;
  } catch (error) {
    console.error(`Failed to resolve SNS domain ${domain}:`, error);
    return null;
  }
}
