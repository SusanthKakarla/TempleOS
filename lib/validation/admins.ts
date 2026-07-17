import { z } from "zod";

export const adminRoleSchema = z.enum(["super_admin", "admin"]);

export const createAdminSchema = z.object({
  phoneNumber: z.string().trim().min(1, "Phone number is required"),
  displayName: z.string().trim().min(1, "Name is required").max(200),
  role: adminRoleSchema,
});

export const updateAdminRoleSchema = z.object({
  role: adminRoleSchema,
});

export type CreateAdminPayload = z.infer<typeof createAdminSchema>;
export type UpdateAdminRolePayload = z.infer<typeof updateAdminRoleSchema>;
