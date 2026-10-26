import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  name: z.string().trim().min(1, "Nombre requerido").max(100),
  roleId: z.string().uuid("Rol requerido"),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    roleId: z.string().uuid().optional(),
  })
  .refine((v) => v.name !== undefined || v.roleId !== undefined, {
    message: "Nada que actualizar",
  });

export const userIdSchema = z.string().uuid();

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
