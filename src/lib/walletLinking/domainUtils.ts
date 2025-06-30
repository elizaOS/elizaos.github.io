import { Connection, PublicKey } from "@solana/web3.js";
import {
  getDomainKeySync,
  NameRegistryState,
  reverseLookup,
} from "@bonfida/spl-name-service";
import { createPublicClient, http, type Address } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

// Array of solana RPC endpoints to try in order
const RPC_ENDPOINTS = [
  "https://solana-mainnet.g.alchemy.com/v2/FVvcC-pCJ3k6BIA5x58Fo",
  "https://api.mainnet-beta.solana.com", // Public Solana RPC
  process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || "", // Alchemy endpoint
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "", // Local/custom endpoint from environment
];

/**
 * Gets the first working RPC endpoint by testing connectivity
 * @param Connection - The Solana Connection class from dynamic import
 * @returns Promise<string> The first working RPC endpoint URL
 * @throws Will throw an error if no endpoints are accessible
 */
async function getWorkingRpcEndpointForSolana(): Promise<string> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, "confirmed");
      await connection.getLatestBlockhash(); // Test connectivity
      return endpoint;
    } catch {
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
export async function resolveSnsDomain(domain: string): Promise<string | null> {
  try {
    const workingEndpoint = await getWorkingRpcEndpointForSolana();
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

/**
 * Resolves an Ethereum Name Service (ENS) domain to its owner's address.
 * @param name The ENS domain name to resolve (e.g., "alice.eth")
 * @returns A Promise that resolves to the Ethereum address of the domain owner
 * @throws Will throw an error if the domain doesn't exist or if there's a network issue
 */
export async function resolveEnsDomain(name: string): Promise<string | null> {
  try {
    const viemClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    const normalizedName = await normalize(name);
    const address = await viemClient.getEnsAddress({ name: normalizedName });
    return address;
  } catch (error) {
    console.error(`Failed to resolve ENS domain ${name}:`, error);
    return null;
  }
}

export async function getSnsDomainForAddress(
  address: string,
): Promise<string | null> {
  try {
    const workingEndpoint = await getWorkingRpcEndpointForSolana();
    const connection = new Connection(workingEndpoint);

    const addressKey = new PublicKey(address);

    const domainName = await reverseLookup(connection, addressKey);
    return domainName;
  } catch {
    return null;
  }
}

export async function getEnsDomainForAddress(
  address: string,
): Promise<string | null> {
  try {
    const viemClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });
    const ensName = await viemClient.getEnsName({
      address: address as Address,
    });
    return ensName;
  } catch {
    return null;
  }
}

// ENS name regex (name.eth format)
// Matches names that end with .eth and contain valid characters
const ENS_NAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.eth$/;

export function validateEnsFormat(name: string): boolean {
  return ENS_NAME_REGEX.test(name);
}

// SNS name regex (name.sol format)
// Matches names that end with .sol and contain valid characters
const SNS_NAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.sol$/;

export function validateSnsFormat(name: string): boolean {
  return SNS_NAME_REGEX.test(name);
}
