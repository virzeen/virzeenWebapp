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
import { addressFormValues } from "@virzeen/validators";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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

// Where keyboard focus goes when the view switches: the form's heading, a card's Edit button, or
// "Add an address" once the removed card has gone from the refreshed list.
type FocusTarget = { to: "heading" } | { to: "edit"; id: string } | { to: "add"; removedId: string | null };

/** Saved addresses with add / edit / remove (remove is confirmed in a Dialog). */
export function AddressBook({ addresses }: { addresses: AddressView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [isPending, startTransition] = useTransition();
  const focusTarget = useRef<FocusTarget | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const editRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    if (target.to === "add" && addresses.some((a) => a.id === target.removedId)) return;
    const element =
      target.to === "heading"
        ? headingRef.current
        : target.to === "add"
          ? addRef.current
          : editRefs.current.get(target.id);
    // A new address's card arrives with the refreshed list: try again on the next render.
    if (!element) return;
    focusTarget.current = null;
    element.focus({ preventScroll: target.to === "heading" });
    if (target.to === "heading") element.scrollIntoView({ block: "nearest" });
  }, [editing, addresses]);

  function show(view: string | "new" | null, focus: FocusTarget) {
    focusTarget.current = focus;
    setEditing(view);
  }

  function saved(id: string) {
    show(null, { to: "edit", id });
    toast.success("Address saved");
    router.refresh();
  }

  function remove(id: string) {
    focusTarget.current = { to: "add", removedId: id };
    startTransition(async () => {
      const result = await deleteAddressAction({ id });
      if (!result.ok) {
        focusTarget.current = null;
        return void toast.error(messageFor(result.error));
      }
      toast.success("Address removed");
      router.refresh();
    });
  }

  const editingAddress = addresses.find((a) => a.id === editing);
  if (editing === "new" || editingAddress) {
    return (
      <section aria-labelledby="address-form-heading" className="flex max-w-2xl flex-col gap-6">
        <h2
          id="address-form-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-h3 focus:outline-none"
        >
          {editingAddress ? "Edit address" : "New address"}
        </h2>
        {editingAddress ? (
          <AddressForm
            addressId={editingAddress.id}
            defaultValues={addressFormValues(editingAddress)}
            onSaved={saved}
            onCancel={() => show(null, { to: "edit", id: editingAddress.id })}
          />
        ) : (
          <AddressForm onSaved={saved} onCancel={() => show(null, { to: "add", removedId: null })} />
        )}
      </section>
    );
  }

  const addButton = (
    <Button ref={addRef} shape="pill" onClick={() => show("new", { to: "heading" })}>
      Add an address
    </Button>
  );

  if (addresses.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="size-5" strokeWidth={1.5} aria-hidden />}
        title="No saved addresses yet."
        action={addButton}
      />
    );
  }

  return (
    <div className="flex flex-col items-start gap-6">
      <ul className="grid w-full gap-4 lg:grid-cols-2">
        {addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            editRef={(element) => {
              if (element) editRefs.current.set(address.id, element);
              else editRefs.current.delete(address.id);
            }}
            onEdit={() => show(address.id, { to: "heading" })}
            onRemove={() => remove(address.id)}
            removing={isPending}
          />
        ))}
      </ul>
      {addButton}
    </div>
  );
}

type AddressCardProps = {
  address: AddressView;
  editRef: (element: HTMLButtonElement | null) => void;
  onEdit: () => void;
  onRemove: () => void;
  removing: boolean;
};

function AddressCard({ address, editRef, onEdit, onRemove, removing }: AddressCardProps) {
  // Every card has an Edit and a Remove: name the address so a screen reader's button list tells them apart.
  const which = `address for ${address.fullName}, ${address.street}`;
  return (
    <li className="flex flex-col gap-4 rounded-md border border-line p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-body font-medium break-words">{address.fullName}</p>
        {address.isDefault && <Badge>Default</Badge>}
      </div>
      <p className="text-small text-ink-muted">
        {address.street}, {address.city}
        <br />
        {address.district}, {address.province}
        {address.landmark && (
          <>
            <br />
            Landmark: {address.landmark}
          </>
        )}
        <br />
        {address.phone}
      </p>
      <div className="mt-auto flex gap-2">
        <Button
          ref={editRef}
          variant="secondary"
          size="sm"
          shape="pill"
          aria-label={`Edit ${which}`}
          onClick={onEdit}
        >
          Edit
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" shape="pill" aria-label={`Remove ${which}`} disabled={removing}>
              Remove
            </Button>
          </DialogTrigger>
          <DialogContent title="Remove this address?" description={`${address.street}, ${address.city}`}>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Keep</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" onClick={onRemove}>
                  Remove
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </li>
  );
}
