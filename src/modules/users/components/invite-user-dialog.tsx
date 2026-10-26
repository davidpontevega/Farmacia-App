"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInviteUser } from "../hooks/use-users";
import { inviteUserSchema, type InviteUserInput } from "../schemas";
import type { RoleOption } from "../types";

export function InviteUserDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleOption[];
}) {
  const invite = useInviteUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: "", name: "", roleId: "" },
  });

  const onSubmit = (values: InviteUserInput) =>
    invite.mutate(values, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Nombre</Label>
            <Input id="invite-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Correo</Label>
            <Input id="invite-email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Rol</Label>
            <select
              id="invite-role"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              {...register("roleId")}
            >
              <option value="">Selecciona un rol</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {errors.roleId && <p className="text-sm text-destructive">{errors.roleId.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? "Enviando…" : "Enviar invitación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
