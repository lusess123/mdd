export const installCommands = [
  "npm install mmd-contracts mmd-engine mmd-renderer",
  "pnpm add mmd-contracts mmd-engine mmd-renderer",
  "yarn add mmd-contracts mmd-engine mmd-renderer",
  "bun add mmd-contracts mmd-engine mmd-renderer",
] as const;

export const installCode = installCommands.join("\n");
