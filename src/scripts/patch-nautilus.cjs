const fs = require("node:fs");
const path = require("node:path");

const filePath = path.resolve(
  __dirname,
  "../../node_modules/@deltadao/nautilus/_esm/publish/index.js",
);

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, "utf8");
  const unpatched =
    "const permissions = await nft.getNftPermissions(nftAddress, address);";
  const patched = `let permissions;\n        try {\n            permissions = await nft.getNftPermissions(nftAddress, address);\n        } catch {\n            // Read may lag the creation transaction by a block or two\n        }`;

  if (content.includes(unpatched)) {
    content = content.replace(unpatched, patched);
    fs.writeFileSync(filePath, content, "utf8");
    console.log(
      "✅ Patched Nautilus waitForMetadataPermission for RPC lag tolerance.",
    );
  }
}
