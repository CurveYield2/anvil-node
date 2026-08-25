import { z } from "zod";
import { api } from "./axios";

const int = (min: number, max: number) =>
  z.number().int().min(min).max(max).optional();

/** Mirrors @anvil_schema in server/lib/ethui/stacks/stack.ex. */
export const anvilOptsSchema = z.object({
  fork_url: z.string().optional(),
  fork_block_number: z.number().optional(),

  accounts: int(1, 100),
  balance: int(0, 1_000_000_000),

  block_time: int(1, 86_400),
  mixed_mining: z.boolean().optional(),
  no_mining: z.boolean().optional(),
  slots_in_an_epoch: int(1, 1024),

  prune_history: z.boolean().optional(),
  transaction_block_keeper: int(1, 1_000_000),
  state_interval: int(1, 86_400),

  gas_limit: int(0, 1_000_000_000_000),
  gas_price: int(0, 1_000_000_000_000_000),
  block_base_fee_per_gas: int(0, 1_000_000_000_000_000),
  code_size_limit: int(0, 10_000_000),
  disable_block_gas_limit: z.boolean().optional(),
  disable_code_size_limit: z.boolean().optional(),
  auto_impersonate: z.boolean().optional(),
});

export const stackSchema = z.object({
  slug: z.string(),
  status: z.enum(["running", "stopped"]),
  chain_id: z.number(),
  rpc_url: z.string(),
  http_rpc: z.string().optional(),
  ws_rpc: z.string(),
  explorer: z.string().optional(),
  explorer_url: z.string(),
  anvil_opts: anvilOptsSchema.optional(),
  graph_url: z.string().optional(),
  ipfs_url: z.string().optional(),
  inserted_at: z.number(),
  updated_at: z.number(),
});

export const createStackInputSchema = z.object({
  slug: z.string(),
  anvil_opts: anvilOptsSchema.optional(),
  graph_opts: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
});

export type Stack = z.infer<typeof stackSchema>;
export type AnvilOpts = z.infer<typeof anvilOptsSchema>;
export type CreateStackInput = z.infer<typeof createStackInputSchema>;

/** Flattens the `{errors: {field: [msg]}}` body the API returns on a 422. */
export function apiErrorMessage(error: unknown, fallback: string) {
  const errors = (
    error as { response?: { data?: { errors?: Record<string, string[]> } } }
  )?.response?.data?.errors;

  if (!errors) return fallback;

  const messages = Object.values(errors).flat();
  return messages.length ? messages.join("; ") : fallback;
}

export const stacks = {
  list: async () => {
    try {
      const res = await api.get("/stacks");
      return z.array(stackSchema).parse(res.data.data);
    } catch (error) {
      console.error("Failed to fetch stacks list:", error);
      throw error;
    }
  },
  get: async (slug: string) => {
    try {
      const res = await api.get(`/stacks/${slug}`);
      return stackSchema.parse(res.data.data);
    } catch (error) {
      console.error("Failed to fetch stack:", error);
      throw error;
    }
  },
  create: async (data: CreateStackInput) => {
    try {
      await api.post("/stacks", data);
    } catch (error) {
      console.error("Failed to create stack:", error);
      throw error;
    }
  },
  delete: async (slug: string) => {
    try {
      const res = await api.delete(`/stacks/${slug}`);
      return res.data;
    } catch (error) {
      console.error("Failed to delete stack:", error);
      throw error;
    }
  },
};
