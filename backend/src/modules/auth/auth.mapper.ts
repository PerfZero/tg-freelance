import type { PublicUser, UserWithProfile } from "./auth.types";

const resolveAvatarUrl = (
  customAvatarDataUrl: string | null,
  telegramAvatarUrl: string | null,
): string | null => customAvatarDataUrl ?? telegramAvatarUrl ?? null;

export const mapPublicUser = (user: UserWithProfile): PublicUser => ({
  id: user.id,
  telegramId: user.telegramId.toString(),
  username: user.username,
  displayName: user.displayName,
  primaryRole: user.profile?.primaryRole ?? null,
  roleFlags: user.roleFlags,
  isBlocked: user.isBlocked,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
  profile: user.profile
    ? {
        about: user.profile.about,
        skills: user.profile.skills,
        portfolioLinks: user.profile.portfolioLinks,
        basePrice: user.profile.basePrice
          ? Number(user.profile.basePrice.toString())
          : null,
        experienceLevel: user.profile.experienceLevel,
        avatarUrl: resolveAvatarUrl(
          user.profile.customAvatarDataUrl,
          user.profile.telegramAvatarUrl,
        ),
        hasCustomAvatar: Boolean(user.profile.customAvatarDataUrl),
        rating: Number(user.profile.rating.toString()),
        completedTasksCount: user.profile.completedTasksCount,
      }
    : null,
});
