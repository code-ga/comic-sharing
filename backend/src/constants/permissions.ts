import { Type } from "@sinclair/typebox";
import { db } from "../database";

export const RESOURCE_DEFINITIONS = {
	user: {
		description: "Application user management",
		actions: {
			read: "View user profiles",
			create: "Create a user profile",
			update: "Update a user profile",
			delete: "Delete a user profile",
			manage: "Assign or revoke roles from users",
		},
	},
	role: {
		description: "RBAC role management",
		actions: {
			read: "View roles and their permissions",
			create: "Create a new role",
			update: "Edit a role's permissions",
			delete: "Delete a role",
			manage: "Manage roles",
		},
	},
} as const;

export type ResourceKey = keyof typeof RESOURCE_DEFINITIONS;
export type Permission = {
	[R in ResourceKey]: `${R}:${keyof (typeof RESOURCE_DEFINITIONS)[R]["actions"] & string}`;
}[ResourceKey];

export interface PermissionMeta {
	id: Permission;
	resource: ResourceKey;
	resourceDescription: string;
	action: string;
	description: string;
}

export interface PermissionGroup {
	resource: ResourceKey;
	description: string;
	permissions: PermissionMeta[];
}

// typebox of permissions for route definitions
export const ResourceKeySchema = Type.String();
export const PermissionSchema = Type.String();
export const PermissionMetaSchema = Type.Object({
	id: PermissionSchema,
	resource: ResourceKeySchema,
	resourceDescription: Type.String(),
	action: Type.String(),
	description: Type.String(),
});
export const PermissionGroupSchema = Type.Object({
	resource: ResourceKeySchema,
	description: Type.String(),
	permissions: Type.Array(PermissionMetaSchema),
});

// → "cluster:read" | "cluster:create" | "user:manage" | ...
// Internal tagged types (not used directly by route authors)
type AndFilter = { _op: "and"; filters: PermissionFilter[] };
type OrFilter = { _op: "or"; filters: PermissionFilter[] };
type NotFilter = { _op: "not"; filter: PermissionFilter };

export type PermissionFilter = Permission | AndFilter | OrFilter | NotFilter;

// Public API
export const and = (...filters: PermissionFilter[]): AndFilter => ({
	_op: "and",
	filters,
});
export const or = (...filters: PermissionFilter[]): OrFilter => ({
	_op: "or",
	filters,
});
export const not = (filter: PermissionFilter): NotFilter => ({
	_op: "not",
	filter,
});

// Flat list — used internally for seeding and validation
export function getAllPermissions(): PermissionMeta[] {
	const permissions: PermissionMeta[] = [];
	for (const [resource, config] of Object.entries(RESOURCE_DEFINITIONS)) {
		for (const [action, description] of Object.entries(config.actions)) {
			permissions.push({
				id: `${resource}:${action}` as Permission,
				resource: resource as ResourceKey,
				resourceDescription: config.description,
				action,
				description,
			});
		}
	}
	return permissions;
}

// Grouped by resource — used by role-editor UI checkboxes and /permissions endpoint
export function getPermissionsGrouped(): PermissionGroup[] {
	const grouped: PermissionGroup[] = [];
	for (const [resource, config] of Object.entries(RESOURCE_DEFINITIONS)) {
		grouped.push({
			resource: resource as ResourceKey,
			description: config.description,
			permissions: Object.entries(config.actions).map(
				([action, description]) => ({
					id: `${resource}:${action}` as Permission,
					resource: resource as ResourceKey,
					resourceDescription: config.description,
					action,
					description,
				}),
			),
		});
	}
	return grouped;
}
export async function resolveUserPermissions(
	roleIds: string[],
): Promise<Set<Permission>> {
	const roles = await db.query.role.findMany({
		where: {
			id: {
				in: roleIds,
			},
		},
	});
	const perms = new Set<Permission>();
	for (const role of roles) {
		for (const p of role.permissions) perms.add(p as Permission);
		if (role.adminRole) {
			// Admin role has all permissions
			getAllPermissions().map((p) => perms.add(p.id));
		}
	}
	return perms;
}

// Recursive evaluator for the PermissionFilter DSL
export function evaluatePermissionFilter(
	userPerms: Set<Permission>,
	filter: PermissionFilter,
): boolean {
	if (typeof filter === "string") return userPerms.has(filter);
	if (filter._op === "and")
		return filter.filters.every((f) => evaluatePermissionFilter(userPerms, f));
	if (filter._op === "or")
		return filter.filters.some((f) => evaluatePermissionFilter(userPerms, f));
	if (filter._op === "not")
		return !evaluatePermissionFilter(userPerms, filter.filter);
	return false;
}
