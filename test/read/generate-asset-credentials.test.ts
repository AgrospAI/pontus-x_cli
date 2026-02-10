import { getAssets } from "@test/helpers/assets";
import { withLogin } from "@test/helpers/login";
import { test } from "vitest";
import GenerateAssetCredentials from "@/commands/generate-asset-credentials";

const CERTIFICATE = "samples/data/certificate.key";
const DIDJSON = "samples/data/did.json";
const PARTICIPANT = "samples/data/CEP.data.json";

const did = getAssets().dataset1Did;

test(
  "generate-asset-credentials command works with valid PARTICIPANT, DIDJSON, and CERTIFICATE",
  withLogin(async () => {
    await GenerateAssetCredentials.run([
      "-p",
      PARTICIPANT,
      "-d",
      DIDJSON,
      "-c",
      CERTIFICATE,
      "-w",
      "",
      did,
    ]);
  }),
  30_000,
);
