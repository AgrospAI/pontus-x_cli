#!/usr/bin/env ts-node

(async () => {
  require("dotenv").config();
  const oclif = await import("@oclif/core");
  await oclif.execute({ development: true, dir: __dirname });
})();
