const validRoles = [
  "platform_admin",
  "company_admin",
  "company_interviewer",
  "candidate",
] as const;

export type ValidRole = (typeof validRoles)[number];

export const VALID_ROLES = validRoles;
