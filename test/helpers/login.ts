import { ACCOUNT_ADDRESS, MANIFEST_PATH } from "@test/config";
import { getEnvVariable } from "@test/helpers/env-mock";
import Login from "@/commands/login";
import Logout from "@/commands/logout";
import { getAccountByAddress, readManifest } from "@/lib/manifest";

/**
 * Wraps a test body with login/logout
 */
export function withLogin(fn: () => Promise<void>) {
  return async () => {
    try {
      const manifest = readManifest(MANIFEST_PATH);
      const account = getAccountByAddress(manifest, ACCOUNT_ADDRESS);

      if (!account) {
        throw new Error(
          `Account with address ${ACCOUNT_ADDRESS} not found in manifest`,
        );
      }

      const privateKey = account.privateKeyPath || "";
      const password = process.env[account.passwordEnvKey] || "";
      await Login.run([privateKey, "-p", password]);
      process.env.PRIVATE_KEY = getEnvVariable("PRIVATE_KEY") ?? "";
      await fn();
    } finally {
      await Logout.run([]);
    }
  };
}
