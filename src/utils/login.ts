import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { NETWORK_CONFIGS, type Network } from "@/config";
import { getOwnerName } from "@/lib/aquarius";
import { readManifest } from "@/lib/manifest";
import { getOwnerAddress, readPrivateKey } from "@/lib/wallet";
import type { Manifest } from "@/types/manifest";

export interface LoginInfo {
  privateKey: string;
  ownerAddress: string;
  ownerName: string;
}

export function getPrivateKeyForOwner(
  loginInfos: LoginInfo[],
  ownerAddress: string,
): string {
  const address = ownerAddress.toLowerCase();
  const loginInfo = loginInfos.find(
    (info) => info.ownerAddress.toLowerCase() === address,
  );

  if (!loginInfo) {
    throw new Error(`No login info found for address ${ownerAddress}`);
  }

  return loginInfo.privateKey;
}

export async function manifestToLoginInfos(
  manifest: Manifest,
): Promise<LoginInfo[]> {
  return Promise.all(
    manifest.accounts.map(async (account) => {
      try {
        const password = process.env[account.passwordEnvKey || ""] || "";
        const privateKey = await readPrivateKey(
          account.privateKeyPath,
          password,
        );
        const ownerAddress = await getOwnerAddress(privateKey);
        const ownerName = await getOwnerName(ownerAddress);

        return {
          privateKey,
          ownerAddress,
          ownerName,
        };
      } catch (err) {
        throw new Error(
          `Failed processing account with keyPath=${account.privateKeyPath}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }),
  );
}

export async function getEnvLoginInfo(): Promise<LoginInfo> {
  const privateKey = process.env.PRIVATE_KEY || "";

  if (privateKey === "") {
    throw new Error(
      `You are not logged in. Please login using "pontus-x_cli login" or set the PRIVATE_KEY environment variable.`,
    );
  }

  const ownerAddress = await getOwnerAddress(privateKey);
  const ownerName = await getOwnerName(ownerAddress);

  return {
    privateKey,
    ownerAddress,
    ownerName,
  };
}

export function printLoginInfos(loginInfos: LoginInfo[]): void {
  loginInfos.forEach((loginInfo, index) => {
    console.log(
      chalk.bold(
        `Account ${(index + 1).toString().padStart(2, "0")}: ${chalk.gray(loginInfo.ownerAddress)} ${chalk.magenta(loginInfo.ownerName)}`,
      ),
    );
  });
  console.log();
}

export async function getLoginInfos(
  manifestPath?: string,
): Promise<LoginInfo[]> {
  let loginInfos: LoginInfo[] = [];
  if (manifestPath) {
    console.log(
      chalk.green(
        `Using manifest file for authentication ${chalk.gray(`(path: ${manifestPath})\n`)}`,
      ),
    );
    const manifest = readManifest(manifestPath);
    loginInfos = await manifestToLoginInfos(manifest);
  } else {
    console.log(
      chalk.green(
        `Using environment variables for authentication ${chalk.gray("(env: PRIVATE_KEY)")}\n`,
      ),
    );
    loginInfos = [await getEnvLoginInfo()];
  }
  return loginInfos;
}

export async function askForNetwork(): Promise<Network> {
  const network = await select({
    message: "Select network:",
    choices: Object.keys(NETWORK_CONFIGS).map((network) => ({
      name: network,
      value: network as Network,
    })),
  });

  return network;
}

export function getEnvNetwork(): Network | null {
  const envNetwork = process.env.NETWORK?.toUpperCase();

  if (!envNetwork) {
    return null;
  }

  const network = Object.keys(NETWORK_CONFIGS).find(
    (network) => network === envNetwork,
  );

  if (!network) {
    throw new Error(
      `Invalid NETWORK environment variable value "${envNetwork}". Please set it to one of: ${Object.keys(
        NETWORK_CONFIGS,
      ).join(", ")}`,
    );
  }

  return network as Network;
}
