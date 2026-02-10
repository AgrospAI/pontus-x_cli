import { getAssets } from "@test/helpers/assets";
import { withLogin } from "@test/helpers/login";
import { describe, expect, test } from "vitest";
import Access from "@/commands/access";
import ChangePrice from "@/commands/change-price";
import Compute from "@/commands/compute";
import ComputeResults from "@/commands/compute-results";
import ComputeStatus from "@/commands/compute-status";
import EditAlgo from "@/commands/edit-algo";
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
      assets.dataset2Did,
      "--algos",
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
});
