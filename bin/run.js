#!/usr/bin/env node

(async () => {
  require("dotenv").config();
  const oclif = await import("@oclif/core");
  await oclif.execute({ dir: __dirname });
})();
