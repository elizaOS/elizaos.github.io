import EthereumIcon from "@/components/icons/EthereumIcon";
import SolanaIcon from "@/components/icons/SolanaIcon";
import { isAddress } from "viem";

interface ChainConfig {
  chainId: string;
  validator: (address: string) => boolean;
  icon: React.ElementType;
}

/**
 * Configuration for currently supported blockchain chains
 *
 * Each chain entry contains:
 * - chainId: CAIP-2 blockchain identifier (mainnet chain IDs used)
 * - validator: Function to validate wallet addresses for this chain
 * - icon: React component for displaying the chain's icon
 *
 * @see https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
 */
export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: "eip155:1",
    validator: (address: string) => isAddress(address),
    icon: EthereumIcon,
  },
  solana: {
    chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    validator: (address: string) =>
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address),
    icon: SolanaIcon,
  },
};

/**
 * List of supported chain names
 * @see SUPPORTED_CHAINS
 */
export const SUPPORTED_CHAINS_NAMES = Object.keys(SUPPORTED_CHAINS);

/**
 * Look up the CAIP-2 chain identifier for a given chain name
 * @param chain The name of the blockchain (e.g., "ethereum", "solana")
 * @returns The CAIP-2 chain identifier if found, empty string otherwise
 */
export function getChainId(chain: string): string {
  const chainConfig =
    SUPPORTED_CHAINS[chain.toLowerCase() as keyof typeof SUPPORTED_CHAINS];
  return chainConfig?.chainId || "";
}

/**
 * Reverse lookup the chain name for a given CAIP-2 chain identifier
 * @param chainId The CAIP-2 chain identifier (e.g., "eip155:1", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")
 * @returns The chain if found, empty string otherwise
 */
export function getChainByChainId(chainId: string): string {
  const entries = Object.entries(SUPPORTED_CHAINS);
  const found = entries.find(([, config]) => config.chainId === chainId);
  return found ? found[0] : "";
}

/**
 * Creates a CAIP-10 account identifier from a chain ID and address
 * account_id: chain_id + ":" + account_address
 *
 * @param chainId The CAIP-2 chain identifier
 * @param address The account address on the specified chain
 * @returns A CAIP-10 compliant account identifier
 * @see https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md
 */
export function createAccountId(chainId: string, address: string): string {
  return `${chainId}:${address}`;
}

/**
 * Validates a wallet address based on a given chain's validator function
 * @param address The wallet address to validate
 * @param chain The blockchain name (e.g., "ethereum", "solana")
 * @returns True if the address is valid for the chain, false otherwise
 */
export function validateAddress(address: string, chain: string): boolean {
  const chainConfig =
    SUPPORTED_CHAINS[chain.toLowerCase() as keyof typeof SUPPORTED_CHAINS];
  if (!chainConfig) {
    return false;
  }
  return chainConfig.validator(address);
}
