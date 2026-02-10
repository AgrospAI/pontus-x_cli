import { readFileSync, writeFileSync } from "node:fs";
import { Command } from "@oclif/core";
import dotenv from "dotenv";

dotenv.config();

export default class Logout extends Command {
  static description = "Logout to remove your private key from .env file";
  static examples: Command.Example[] = ["<%= config.bin %> <%= command.id %>"];

  async run(): Promise<void> {
    const envConfig = dotenv.parse(readFileSync(".env", "utf8"));
    delete envConfig.PRIVATE_KEY;
    const updatedEnvConfig = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    writeFileSync(".env", updatedEnvConfig, "utf8");
    this.log("Logged out and removed PRIVATE_KEY from .env");
  }
}
