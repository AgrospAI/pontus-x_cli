import { withLogin } from "@test/helpers/login";
import { test } from "vitest";
import GenerateParticipantCredentials from "@/commands/generate-participant-credentials";

const CERTIFICATE = "samples/data/certificate.key";
const DIDJSON = "samples/data/did.json";
const PARTICIPANT = "samples/data/CEP.data.json";

test(
  "generate-participant-credentials command works with valid PARTICIPANT, DIDJSON, and CERTIFICATE",
  withLogin(async () => {
    await GenerateParticipantCredentials.run([
      "-p",
      PARTICIPANT,
      "-d",
      DIDJSON,
      "-c",
      CERTIFICATE,
      "-w",
      "",
    ]);
  }),
  30_000,
);
