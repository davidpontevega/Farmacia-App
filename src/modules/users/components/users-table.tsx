"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { Can } from "@/modules/auth/components/can";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { useSetUserActive, useUpdateUser, useUsers } from "../hooks/use-users";
import type { UserRow } from "../types";
import { InviteUserDialog } from "./invite-user-dialog";

function StatusBadge({ user }: { user: UserRow }) {
  if (!user.isActive) return <Badge variant="secondary">Inactivo</Badge>;
  if (user.pending) return <Badge variant="outline">Invitación pendiente</Badge>;
  return <Badge>Activo</Badge>;
}

export function UsersTable() {
  const { data, isLoading, error } = useUsers();
  const { can } = usePermissions();
  const update = useUpdateUser();
  const setActive = useSetUserActive();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<UserRow | null>(null);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error || !data) {
    return <p className="text-destructive">{apiErrorMessage(error)}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Can permission="users.create">
          <Button onClick={() => setInviteOpen(true)}>Invitar usuario</Button>
        </Can>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <select
                  aria-label={`Rol de ${u.name}`}
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={u.roles[0]?.id ?? ""}
                  disabled={!can("users.update") || update.isPending}
                  onChange={(e) => update.mutate({ id: u.id, roleId: e.target.value })}
                >
                  {!u.roles[0] && <option value="">Sin rol</option>}
                  {data.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </TableCell>
              <TableCell>
                <StatusBadge user={u} />
              </TableCell>
              <TableCell className="text-right">
                <Can permission="users.deactivate">
                  {u.isActive ? (
                    <Button variant="outline" size="sm" onClick={() => setToDeactivate(u)}>
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={setActive.isPending}
                      onClick={() => setActive.mutate({ id: u.id, active: true })}
                    >
                      Reactivar
                    </Button>
                  )}
                </Can>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} roles={data.roles} />

      <Dialog open={!!toDeactivate} onOpenChange={(open) => !open && setToDeactivate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar a {toDeactivate?.name}</DialogTitle>
            <DialogDescription>
              Perderá el acceso de inmediato y se cerrarán sus sesiones. Sus ventas y turnos se conservan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDeactivate(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={setActive.isPending}
              onClick={() =>
                toDeactivate &&
                setActive.mutate(
                  { id: toDeactivate.id, active: false },
                  { onSettled: () => setToDeactivate(null) },
                )
              }
            >
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
