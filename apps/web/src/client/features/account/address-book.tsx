"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  EmptyState,
  toast,
} from "@virzeen/ui";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { deleteAddressAction } from "@/server/actions/account";
import { AddressForm } from "./address-form";

export type AddressView = {
  id: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  city: string;
  street: string;
  landmark: string | null;
  isDefault: boolean;
};

/** Saved addresses with add / edit / remove (remove is confirmed in a Dialog). */
export function AddressBook({ addresses }: { addresses: AddressView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length === 0 ? "new" : null);
  const [isPending, startTransition] = useTransition();

  function saved() {
    setEditing(null);
    toast.success("Address saved");
    router.refresh();
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteAddressAction({ id });
      if (!result.ok) return void toast.error(messageFor(result.error));
      toast.success("Address removed");
      router.refresh();
    });
  }

  if (editing === "new") {
    return (
      <section aria-labelledby="new-address" className="flex flex-col gap-6">
        <h2 id="new-address" className="font-display text-h3">
          New address
        </h2>
        <AddressForm onSaved={saved} onCancel={addresses.length > 0 ? () => setEditing(null) : undefined} />
      </section>
    );
  }

  const editingAddress = addresses.find((a) => a.id === editing);
  if (editingAddress) {
    return (
      <section aria-labelledby="edit-address" className="flex flex-col gap-6">
        <h2 id="edit-address" className="font-display text-h3">
          Edit address
        </h2>
        <AddressForm
          addressId={editingAddress.id}
          defaultValues={{
            ...editingAddress,
            landmark: editingAddress.landmark ?? "",
            province: editingAddress.province as never,
          }}
          onSaved={saved}
          onCancel={() => setEditing(null)}
        />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-5" strokeWidth={1.5} aria-hidden />}
          title="No saved addresses yet."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="flex flex-col gap-4 rounded-md border border-line p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-body font-medium">{address.fullName}</p>
                {address.isDefault && <Badge>Default</Badge>}
              </div>
              <p className="text-small text-ink-muted">
                {address.street}, {address.city}
                <br />
                {address.district}, {address.province}
                {address.landmark && (
                  <>
                    <br />
                    Near {address.landmark}
                  </>
                )}
                <br />
                {address.phone}
              </p>
              <div className="mt-auto flex gap-2">
                <Button variant="secondary" size="sm" shape="pill" onClick={() => setEditing(address.id)}>
                  Edit
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" shape="pill" disabled={isPending}>
                      Remove
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    title="Remove this address?"
                    description={`${address.street}, ${address.city}`}
                  >
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="secondary">Keep</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant="destructive" onClick={() => remove(address.id)}>
                          Remove
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button shape="pill" className="self-start" onClick={() => setEditing("new")}>
        Add an address
      </Button>
    </div>
  );
}
