import { Prisma } from "@prisma/client";

export function toJsonInput(
  value: unknown
): typeof Prisma.JsonNull | Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

