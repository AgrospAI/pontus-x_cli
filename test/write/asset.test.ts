import { getAssets } from "@test/helpers/assets";
import { withLogin } from "@test/helpers/login";
import { describe, expect, test } from "vitest";
import Access from "@/commands/access";
import ChangePrice from "@/commands/change-price";
import Compute from "@/commands/compute";
import ComputeResults from "@/commands/compute-results";
import ComputeStatus from "@/commands/compute-status";
import EditAlgo from "@/commands/edit-algo";
import EditAssetAllowed from "@/commands/edit-asset-allowed";
import EditAssetUrl from "@/commands/edit-asset-url";
import EditTrustedAlgos from "@/commands/edit-trusted-algos";
import SelfDescription from "@/commands/self-description";

describe.sequential("Asset Commands", () => {
  const assets = getAssets();

  test(
    "access command works with valid DID after login",
    withLogin(async () => {
      const did = assets.dataset1Did;
      await Access.run([did]);
    }),
  );

  test(
    "change-price command updates asset price",
    withLogin(async () => {
      const did = assets.dataset2Did;
      const randomAmount = (Math.floor(Math.random() * 1000) + 1) / 100;
      await ChangePrice.run([did, randomAmount.toString(), "-y"]);
    }),
    30_000,
  );

  test(
    "edit-asset-url command updates asset URL",
    withLogin(async () => {
      const did = assets.dataset1Did;
      const newUrl =
        "https://raw.githubusercontent.com/plotly/datasets/refs/heads/master/titanic.csv";
      await EditAssetUrl.run([did, newUrl, "-y"]);
    }),
    30_000,
  );

  test(
    "edit-algo command updates algorithm details",
    withLogin(async () => {
      const randomTag = (
        (Math.floor(Math.random() * 1000) + 1) /
        100
      ).toString();
      await EditAlgo.run([
        assets.algorithm2Did,
        "rogargon/pandas-profiling",
        randomTag,
        "sha256:81dca5439f07dff4d56097546a9fce7335be3de8e2622dc105c64e54376f86b5",
        "python /algorithm/src/main.py",
        "-y",
      ]);
    }),
    30_000,
  );

  test("edit-trusted-algos command updates trusted algorithms", async () => {
    await EditTrustedAlgos.run([
      "-d",
      assets.dataset2Did,
      "-a",
      assets.algorithm1Did,
      assets.algorithm2Did,
      "-y",
    ]);
  }, 30_000);

  test(
    "self-description command attaches self-description to asset",
    withLogin(async () => {
      const sdUrl = "https://example.com/self-description.json";
      await SelfDescription.run([assets.algorithm1Did, sdUrl, "-y"]);
    }),
    30_000,
  );

  test(
    "compute job works",
    withLogin(async () => {
      const computeJob = await Compute.run([
        assets.algorithm1Did,
        "-d",
        assets.dataset2Did,
        "-y",
      ]);
      expect(computeJob).toBeDefined();
      const firstJob = Array.isArray(computeJob) ? computeJob[0] : computeJob;
      const jobDid = firstJob?.jobId;
      expect(jobDid).toBeDefined();
      await ComputeResults.run([jobDid as string]);
      await ComputeStatus.run([jobDid as string]);
    }),
    60_000,
  );

  test(
    "compute job with multiple datasets works",
    withLogin(async () => {
      const computeJob = await Compute.run([
        assets.algorithm1Did,
        "-d",
        assets.dataset2Did,
        "-d",
        assets.dataset3Did,
        "-y",
      ]);
      expect(computeJob).toBeDefined();
      const firstJob = Array.isArray(computeJob) ? computeJob[0] : computeJob;
      const jobDid = firstJob?.jobId;
      expect(jobDid).toBeDefined();
      await ComputeResults.run([jobDid as string]);
      await ComputeStatus.run([jobDid as string]);
    }),
    60_000,
  );

  test(
    "edit-asset-allowed sets allowed users for a single dataset",
    withLogin(async () => {
      const allowedAddress = "0xAbC1230000000000000000000000000000dEf1";
      await EditAssetAllowed.run([
        "-u",
        allowedAddress,
        "-d",
        assets.dataset1Did,
        "-y",
      ]);
    }),
    30_000,
  );

  test(
    "edit-asset-allowed sets allowed users for multiple datasets",
    withLogin(async () => {
      const allowedAddress1 = "0xAbC1230000000000000000000000000000dEf1";
      const allowedAddress2 = "0x1234560000000000000000000000000000789a";
      await EditAssetAllowed.run([
        "-u",
        allowedAddress1,
        allowedAddress2,
        "-d",
        assets.dataset2Did,
        assets.dataset3Did,
        "-y",
      ]);
    }),
    30_000,
  );

  test(
    "edit-asset-allowed makes an asset public, removing restrictions",
    withLogin(async () => {
      await EditAssetAllowed.run(["-d", assets.dataset1Did, "--public", "-y"]);
    }),
    30_000,
  );

  test(
    "edit-asset-allowed works for algorithm assets",
    withLogin(async () => {
      const allowedAddress = "0xAbC1230000000000000000000000000000dEf1";
      await EditAssetAllowed.run([
        "-u",
        allowedAddress,
        "-d",
        assets.algorithm1Did,
        "-y",
      ]);
    }),
    30_000,
  );

  test(
    "edit-asset-allowed errors when both --public and -u are specified",
    withLogin(async () => {
      const allowedAddress = "0xAbC1230000000000000000000000000000dEf1";
      await expect(
        EditAssetAllowed.run([
          "-u",
          allowedAddress,
          "-d",
          assets.dataset1Did,
          "--public",
          "-y",
        ]),
      ).rejects.toThrow();
    }),
    30_000,
  );

  test(
    "edit-asset-allowed errors when neither --public nor -u are specified",
    withLogin(async () => {
      await expect(
        EditAssetAllowed.run(["-d", assets.dataset1Did, "-y"]),
      ).rejects.toThrow();
    }),
    30_000,
  );
});
