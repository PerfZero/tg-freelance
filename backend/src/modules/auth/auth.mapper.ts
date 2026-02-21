import type { PublicUser, UserWithProfile } from "./auth.types";

export const mapPublicUser = (user: UserWithProfile): PublicUser => ({
  id: user.id,
  telegramId: user.telegramId.toString(),
  username: user.username,
  displayName: user.displayName,
  roleFlags: user.roleFlags,
  isBlocked: user.isBlocked,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
  profile: user.profile
    ? {
        about: user.profile.about,
        skills: user.profile.skills,
        rating: Number(user.profile.rating.toString()),
        completedTasksCount: user.profile.completedTasksCount
      }
    : null
});
