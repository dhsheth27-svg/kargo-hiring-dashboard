import { prisma } from "./prisma";
import type { ActivityType } from "./types";

export async function logActivity(
  candidateId: string,
  type: ActivityType,
  message: string
) {
  await prisma.activity.create({ data: { candidateId, type, message } });
}
