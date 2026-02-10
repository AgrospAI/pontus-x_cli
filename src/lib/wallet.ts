import { readFileSync } from "node:fs";
import Wallet from "ethereumjs-wallet";

export async function getPrivateKey(
  privateKeyPath: string,
  password: string = "",
): Promise<string> {
  const keyStore = JSON.parse(readFileSync(privateKeyPath, "utf8"));
  const wallet = await Wallet.fromV3(keyStore, password);
  return wallet.getPrivateKeyString();
}
