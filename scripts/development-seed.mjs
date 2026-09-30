import { developmentSeedResetConfirmation, developmentSeedService } from "../server/services/seeding/DevelopmentSeedService.ts";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const command = args.get("command") ?? "verify";
const environment = args.get("environment") ?? process.env.SEED_ENVIRONMENT;
const includePasswords = args.get("include-passwords") === "true" || process.env.SEED_PRINT_PASSWORDS === "true";
const confirmation = args.get("confirm") ?? process.env.SEED_RESET_CONFIRM;

const print = (payload) => {
  console.log(JSON.stringify(payload, null, 2));
};

try {
  if (command === "development") {
    print(await developmentSeedService.seed({ environment: environment ?? "development", includePasswords: includePasswords || true }));
  } else if (command === "staging") {
    print(await developmentSeedService.seed({ environment: environment ?? "staging", includePasswords }));
  } else if (command === "reset") {
    print(await developmentSeedService.reset({ environment: environment ?? "development", confirmation }));
  } else if (command === "verify") {
    const report = await developmentSeedService.verify({ environment });
    print(report);
    if (report.status !== "pass") process.exitCode = 1;
  } else if (command === "users") {
    print(await developmentSeedService.listUsers({ environment: environment ?? "development", includePasswords }));
  } else if (command === "reset-confirmation") {
    print({ confirmation: developmentSeedResetConfirmation });
  } else {
    throw new Error(`Unknown development seed command "${command}".`);
  }
} catch (error) {
  print({ success: false, error: error instanceof Error ? error.message : "Development seed command failed." });
  process.exitCode = 1;
}
