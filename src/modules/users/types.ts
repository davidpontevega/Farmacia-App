// Forma JSON de GET /api/users (no incluye clerk_id).
export type RoleOption = { id: string; slug: string; name: string };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  /** Invitado que aún no aceptó la invitación. */
  pending: boolean;
  roles: RoleOption[];
};

export type UsersResponse = { users: UserRow[]; roles: RoleOption[] };
