import { readFileSync } from "node:fs";
import Wallet from "ethereumjs-wallet";

export async function readPrivateKey(
  privateKeyPath: string,
  password: string = "",
): Promise<string> {
  const keyStore = JSON.parse(readFileSync(privateKeyPath, "utf8"));
  const wallet = await Wallet.fromV3(keyStore, password);
  return wallet.getPrivateKeyString();
}

export async function getOwnerAddress(privateKey: string): Promise<string> {
  const wallet = Wallet.fromPrivateKey(
    Buffer.from(privateKey.replace(/^0x/, ""), "hex"),
  );
  return wallet.getAddressString();
}
