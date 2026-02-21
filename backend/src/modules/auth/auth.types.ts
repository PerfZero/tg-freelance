import type { Profile, User } from "@prisma/client";

export type UserWithProfile = User & {
  profile: Profile | null;
};

export type PublicProfile = {
  about: string | null;
  skills: string[];
  rating: number;
  completedTasksCount: number;
};

export type PrimaryRoleValue = "CUSTOMER" | "EXECUTOR";

export type PublicUser = {
  id: string;
  telegramId: string;
  username: string | null;
  displayName: string;
  primaryRole: PrimaryRoleValue | null;
  roleFlags: unknown;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  profile: PublicProfile | null;
};
