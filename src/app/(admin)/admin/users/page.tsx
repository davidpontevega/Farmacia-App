import { requirePagePermission } from "@/lib/auth";
import { UsersTable } from "@/modules/users/components/users-table";

export default async function UsersPage() {
  await requirePagePermission("users.read");
  return <UsersTable />;
}
