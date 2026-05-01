import { eq } from "drizzle-orm";
import { db } from "../database";
import { profile, user } from "../database/schema";
import { getInitialRoleIds } from "./role";

/**
 * System user ID constant. This is used for system-generated actions
 * where an authorId is required but no real user is performing the action.
 */
export const SYSTEM_USER_ID = "system";

/**
 * Ensures the system user and its profile exist in the database and returns the profile ID.
 * This function should be called during application initialization or seeding to create the system user if it doesn't exist.
 *
 * @returns The system profile ID
 */
export async function getOrCreateSystemProfile() {
	// Check if system user already exists
	const existingUser = await db
		.select()
		.from(user)
		.where(eq(user.id, SYSTEM_USER_ID))
		.limit(1);

	const userId = SYSTEM_USER_ID;

	if (existingUser.length === 0) {
		// Create system user if it doesn't exist
		await db.insert(user).values({
			id: SYSTEM_USER_ID,
			name: "System",
			email: "system@comic-sharing.local",
			emailVerified: true,
			image: null,
		});
		console.log("Created system user for automated actions.");
	}

	// Check if system profile exists
	const existingProfile = await db
		.select()
		.from(profile)
		.where(eq(profile.userId, userId))
		.limit(1);

	if (existingProfile.length > 0) {
		return existingProfile[0];
	}

	// Create system profile if it doesn't exist
	const systemProfileId = `profile_${SYSTEM_USER_ID}`;
	const systemProfile = await db
		.insert(profile)
		.values({
			id: systemProfileId,
			userId: userId,
			username: "system",
			rolesIDs: await getInitialRoleIds(true),
			isSystemDefault: true,
		})
		.returning();

	console.log("Created system profile for automated actions.");
	return systemProfile[0]!;
}

/**
 * Gets the system user ID. Assumes the system user has been created.
 * Use getOrCreateSystemUser() during initialization to ensure it exists.
 *
 * @returns The system user ID
 */
export function getSystemUserId(): string {
	return SYSTEM_USER_ID;
}

/**
 * Gets the system profile ID. Assumes the system profile has been created.
 * Use getOrCreateSystemUser() during initialization to ensure it exists.
 *
 * @returns The system profile ID
 */
export function getSystemProfileId(): string {
	return `profile_${SYSTEM_USER_ID}`;
}
