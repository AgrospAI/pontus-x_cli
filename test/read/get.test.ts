import { getAssets } from "@test/helpers/assets";
import { withLogin } from "@test/helpers/login";
import { test } from "vitest";
import Get from "@/commands/get";

const did = getAssets().dataset1Did;

test(
  "get command retrieves asset metadata after login",
  withLogin(async () => {
    await Get.run([did]);
  }),
);
