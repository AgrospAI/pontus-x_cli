import { z } from "zod";

export const accountSchema = z.object({
  address: z.string(),
  name: z.string().optional(),
  passwordEnvKey: z.string(),
  privateKeyPath: z.string(),
});

export const manifestSchema = z.object({
  accounts: z.array(accountSchema),
});

export type Account = z.infer<typeof accountSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
