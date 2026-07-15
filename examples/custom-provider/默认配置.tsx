"use client";

import { MmdProvider, MmdRenderer } from "mmd-renderer";

export function DefaultProviderExample() {
  return (
    <MmdProvider>
      <MmdRenderer model="Product" view="listview" />
    </MmdProvider>
  );
}
