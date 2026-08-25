import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ethui/ui/components/shadcn/card";
import { Label } from "@ethui/ui/components/shadcn/label";
import { Separator } from "@ethui/ui/components/shadcn/separator";
import { Switch } from "@ethui/ui/components/shadcn/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle,
  Database,
  GitFork,
  Layers,
  Loader2,
  Settings2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";
import {
  type AnvilOpts,
  anvilOptsSchema,
  apiErrorMessage,
  createStackInputSchema,
  stacks,
} from "~/api/stacks";
import { BackButton } from "~/components/BackButton";
import { DefaultAddresses } from "~/components/DefaultAddresses";
import { StackProvider } from "~/components/StackProvider";
import { useGetStack } from "~/hooks/useStacks";

export const Route = createFileRoute("/_authenticated/dashboard/new")({
  component: NewStackPage,
});

const advancedSchema = anvilOptsSchema.omit({
  fork_url: true,
  fork_block_number: true,
});

/** Mirrors validate_anvil_opts_conflicts/1 in server/lib/ethui/stacks/stack.ex. */
function miningConflicts(opts: Partial<AnvilOpts>): string[] {
  const messages = [];

  if (opts.mixed_mining && !opts.block_time) {
    messages.push("Mixed mining requires a block time.");
  }

  if (opts.no_mining && (opts.block_time || opts.mixed_mining)) {
    messages.push(
      "Mine on demand cannot be combined with block time or mixed mining.",
    );
  }

  return messages;
}

const stackFormSchema = z
  .object({
    slug: z
      .string()
      .min(1, "Stack name is required")
      .regex(
        /^[a-z][a-z0-9-]*$/,
        "Must start with a letter and contain only lowercase letters, numbers, and hyphens",
      ),
    forkUrl: z.string().optional(),
    forkBlockNumber: z.number().optional(),
    advanced: advancedSchema,
  })
  .superRefine((data, ctx) => {
    for (const message of miningConflicts(data.advanced)) {
      ctx.addIssue({ code: "custom", path: ["advanced"], message });
    }
  });

type StackFormData = z.infer<typeof stackFormSchema>;

const ADVANCED_NUMBERS = [
  { name: "accounts", label: "Dev Accounts", placeholder: "10" },
  { name: "balance", label: "Account Balance (ETH)", placeholder: "10000" },
  { name: "block_time", label: "Block Time (s)", placeholder: "On demand" },
  { name: "slots_in_an_epoch", label: "Slots in an Epoch", placeholder: "32" },
  {
    name: "state_interval",
    label: "State Dump Interval (s)",
    placeholder: "On exit",
  },
  {
    name: "transaction_block_keeper",
    label: "Blocks Kept in Memory",
    placeholder: "Unlimited",
  },
  { name: "gas_limit", label: "Block Gas Limit", placeholder: "Default" },
  { name: "gas_price", label: "Gas Price (wei)", placeholder: "Default" },
  {
    name: "block_base_fee_per_gas",
    label: "Base Fee (wei)",
    placeholder: "Default",
  },
  {
    name: "code_size_limit",
    label: "Code Size Limit (bytes)",
    placeholder: "24576",
  },
] as const satisfies readonly {
  name: keyof AnvilOpts;
  label: string;
  placeholder: string;
}[];

const ADVANCED_FLAGS = [
  { name: "mixed_mining", label: "Mixed mining (timer + on submit)" },
  { name: "no_mining", label: "Mine on demand only" },
  { name: "prune_history", label: "Prune history (nothing persisted to disk)" },
  { name: "disable_block_gas_limit", label: "Disable block gas limit" },
  { name: "disable_code_size_limit", label: "Disable code size limit" },
  { name: "auto_impersonate", label: "Auto-impersonate any sender" },
] as const satisfies readonly { name: keyof AnvilOpts; label: string }[];

const PRESET_NETWORKS = [
  {
    name: "Ethereum",
    url: "https://gateway.tenderly.co/public/mainnet",
    chainId: 1,
  },
  { name: "Arbitrum One", url: "https://arb1.arbitrum.io/rpc", chainId: 42161 },
  { name: "OP Mainnet", url: "https://mainnet.optimism.io", chainId: 10 },
  { name: "Base", url: "https://mainnet.base.org", chainId: 8453 },
  { name: "Polygon", url: "https://polygon-rpc.com", chainId: 137 },
] as const;

function NewStackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [enableFork, setEnableFork] = useState(false);
  const [enableGraph, setEnableGraph] = useState(false);
  const [enableAdvanced, setEnableAdvanced] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const { data: createdStack } = useGetStack(createdSlug ?? "", {
    enabled: !!createdSlug,
  });

  const form = useForm<StackFormData>({
    mode: "onChange",
    resolver: zodResolver(stackFormSchema),
    defaultValues: {
      slug: "",
      forkUrl: "",
      forkBlockNumber: undefined,
      advanced: Object.fromEntries(
        ADVANCED_FLAGS.map(({ name }) => [name, false]),
      ),
    },
  });

  const createMutation = useMutation({
    mutationFn: stacks.create,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stacks"] });
      toast.success("Stack created successfully");
      setCreatedSlug(variables.slug);
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, "Failed to create stack"));
    },
  });

  const currentForkUrl = form.watch("forkUrl");

  // Read from the live values, not formState.errors: with mode "onChange" RHF
  // only keeps issues whose path is the field that just changed, so a
  // cross-field issue never survives long enough to render.
  const advancedConflicts = miningConflicts(form.watch("advanced"));

  const handleSubmit = (data: StackFormData) => {
    const anvilOpts: AnvilOpts = {
      ...(enableFork && data.forkUrl
        ? { fork_url: data.forkUrl, fork_block_number: data.forkBlockNumber }
        : {}),
      ...(enableAdvanced ? prune(data.advanced) : {}),
    };

    const input = createStackInputSchema.parse({
      slug: data.slug,
      anvil_opts: Object.keys(anvilOpts).length ? anvilOpts : undefined,
      graph_opts: enableGraph ? { enabled: true } : undefined,
    });

    createMutation.mutate(input);
  };

  if (createdStack) {
    return (
      <StackProvider stack={createdStack}>
        <div className="flex items-start justify-center px-6 py-12">
          <div className="w-full max-w-2xl space-y-6">
            <Card className="animate-fade-in-up rounded-xl shadow-lg opacity-0">
              <CardHeader className="pb-4 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10">
                  <CheckCircle className="h-7 w-7 text-green-500" />
                </div>
                <CardTitle className="text-2xl">Stack Created!</CardTitle>
                <CardDescription>
                  Your stack "{createdStack.slug}" is ready to use.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center gap-3 px-8 pb-8">
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() =>
                    navigate({
                      to: "/dashboard/$slug/add-chain",
                      params: { slug: createdStack.slug },
                    })
                  }
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Add to Wallet
                </Button>
              </CardContent>
            </Card>
            <DefaultAddresses className="animation-delay-100 animate-fade-in-up opacity-0" />
          </div>
        </div>
      </StackProvider>
    );
  }

  return (
    <div className="flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <BackButton label="Back to Dashboard" />

        <Card className="animation-delay-100 animate-fade-in-up rounded-xl shadow-lg opacity-0">
          <CardHeader className="pb-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Layers className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create Stack</CardTitle>
            <CardDescription>
              Spin up a new on-demand Anvil node
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <Form form={form} onSubmit={handleSubmit} className="space-y-6">
              <div className="w-full space-y-3">
                <Form.Text
                  name="slug"
                  label="Stack Name"
                  placeholder="my-dev-stack"
                />
                <p className="text-muted-foreground text-xs">
                  Your RPC URL: https://
                  <span className="font-medium text-foreground">
                    {form.watch("slug") || "my-stack"}
                  </span>
                  .stacks.ethui.dev
                </p>
              </div>

              <Separator />

              <ToggleSection
                icon={GitFork}
                title="Fork Network"
                description="Start from an existing network state"
                enabled={enableFork}
                onToggle={setEnableFork}
              >
                <div className="ml-12 space-y-4 rounded-lg border border-border bg-muted/50 p-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Quick Select
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_NETWORKS.map((network) => (
                        <button
                          key={network.url}
                          type="button"
                          onClick={() => form.setValue("forkUrl", network.url)}
                          className={`rounded-full cursor-pointer border px-3 py-1.5 text-xs font-medium transition-colors ${
                            currentForkUrl === network.url
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {network.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Form.Text
                    name="forkUrl"
                    label="Fork RPC URL"
                    placeholder="https://eth.llamarpc.com"
                    className="w-full"
                  />

                  <Form.NumberField
                    name="forkBlockNumber"
                    label="Fork Block Number"
                    placeholder="Latest block if empty"
                    className="w-full"
                  />
                </div>
              </ToggleSection>

              <Separator />

              <ToggleSection
                icon={Database}
                title="Subgraph Indexing"
                description="Enable The Graph protocol"
                enabled={enableGraph}
                onToggle={setEnableGraph}
              >
                <div className="ml-12 rounded-lg border border-border bg-muted/50 p-4">
                  <p className="text-muted-foreground text-sm">
                    A Graph node will be provisioned alongside your Anvil
                    instance for deploying and querying subgraphs.
                  </p>
                </div>
              </ToggleSection>

              <Separator />

              <ToggleSection
                icon={Settings2}
                title="Advanced Anvil Options"
                description="Mining, finality, history and EVM limits"
                enabled={enableAdvanced}
                onToggle={setEnableAdvanced}
              >
                <div className="ml-12 space-y-4 rounded-lg border border-border bg-muted/50 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ADVANCED_NUMBERS.map(({ name, label, placeholder }) => (
                      <Form.NumberField
                        key={name}
                        name={`advanced.${name}`}
                        label={label}
                        placeholder={placeholder}
                        className="w-full"
                      />
                    ))}
                  </div>

                  <div className="space-y-2">
                    {ADVANCED_FLAGS.map(({ name, label }) => (
                      <Form.Checkbox
                        key={name}
                        name={`advanced.${name}`}
                        label={label}
                      />
                    ))}
                  </div>

                  {advancedConflicts.length > 0 && (
                    <ul className="space-y-1 text-destructive text-xs">
                      {advancedConflicts.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  )}

                  <p className="text-muted-foreground text-xs">
                    Host, port, chain ID and the state file stay managed by
                    stacks and can't be overridden.
                  </p>
                </div>
              </ToggleSection>

              <Separator />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Form.Submit className="flex-1" label="Create Stack">
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Stack
                </Form.Submit>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Empty number inputs and unchecked boxes must not become anvil flags. */
function prune(opts: AnvilOpts): AnvilOpts {
  return Object.fromEntries(
    Object.entries(opts).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (typeof value === "number") return !Number.isNaN(value);
      return value !== false;
    }),
  );
}

interface ToggleSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children?: React.ReactNode;
}

function ToggleSection({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  children,
}: ToggleSectionProps) {
  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <Label className="font-medium text-sm">{title}</Label>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && children}
    </div>
  );
}
