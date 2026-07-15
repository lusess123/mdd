import type { Product } from "mmd-contracts";

export const seededProducts: Product[] = [
  {
    id: "product-1001",
    name: "Aurora Desk Lamp",
    sku: "LAMP-001",
    cover:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=128&h=128&q=80",
    price: 129.99,
    tags: ["lighting", "workspace"],
    status: "draft",
    inventory: 24,
    createdAt: "2026-07-12T08:00:00.000Z",
    updatedAt: "2026-07-12T08:00:00.000Z"
  },
  {
    id: "product-1002",
    name: "Orbit Mechanical Keyboard",
    sku: "KEY-002",
    cover:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=128&h=128&q=80",
    price: 189,
    tags: ["keyboard", "workspace"],
    status: "published",
    inventory: 12,
    createdAt: "2026-07-11T08:00:00.000Z",
    updatedAt: "2026-07-13T08:00:00.000Z"
  },
  {
    id: "product-1003",
    name: "Slate Grid Notebook",
    sku: "NOTE-003",
    cover:
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=128&h=128&q=80",
    price: 18.5,
    tags: ["stationery"],
    status: "archived",
    inventory: 0,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-14T08:00:00.000Z"
  }
];
