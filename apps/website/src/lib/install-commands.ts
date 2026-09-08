export const installCommands = [
  "npm install mmd-contracts@beta mmd-engine@beta mmd-renderer@beta",
  "pnpm add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta",
  "yarn add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta",
  "bun add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta",
] as const;

export const installCode = installCommands.join("\n");
