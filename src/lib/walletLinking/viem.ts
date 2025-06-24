import type { PublicClient } from "viem";

let viemClient: PublicClient | null = null;

export async function getViemClient(): Promise<PublicClient> {
  if (!viemClient) {
    const { createPublicClient, http } = await import("viem");
    const { mainnet } = await import("viem/chains");

    viemClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });
  }
  return viemClient;
}

export async function isAddress(address: string): Promise<boolean> {
  const { isAddress } = await import("viem");
  return isAddress(address);
}

export async function normalizeEns(name: string): Promise<string> {
  const { normalize } = await import("viem/ens");
  return normalize(name);
}
