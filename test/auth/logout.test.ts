import { getEnvVariable } from "@test/helpers/env-mock";
import { withLogin } from "@test/helpers/login";
import { expect, test } from "vitest";
import Logout from "@/commands/logout";

test(
  "run logout removes PRIVATE_KEY",
  withLogin(async () => {
    await Logout.run([]);
    expect(getEnvVariable("PRIVATE_KEY")).toBeNull();
  }),
);
