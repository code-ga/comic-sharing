import type { RESOURCE_DEFINITIONS } from "@comic-sharing/backend";

export type ResourceKey = keyof typeof RESOURCE_DEFINITIONS;

export type Action =
	(typeof RESOURCE_DEFINITIONS)[ResourceKey]["actions"][keyof (typeof RESOURCE_DEFINITIONS)[ResourceKey]["actions"]];

export type Permission = `${ResourceKey}:${Action}`;

export type PermissionFilter =
	| Permission
	| { _op: "and"; filters: PermissionFilter[] }
	| { _op: "or"; filters: PermissionFilter[] }
	| { _op: "not"; filter: PermissionFilter };

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
