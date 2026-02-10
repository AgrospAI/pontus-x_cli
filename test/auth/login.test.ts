import { getEnvVariable } from "@test/helpers/env-mock";
import { withLogin } from "@test/helpers/login";
import { expect, test } from "vitest";

test(
  "run login writes PRIVATE_KEY",
  withLogin(async () => {
    expect(getEnvVariable("PRIVATE_KEY")).not.toBeNull();
  }),
);
