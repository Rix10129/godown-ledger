"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition, type FormEvent } from "react";
import { quickCreateCustomer } from "@/app/(dashboard)/customers/actions";

type CustomerOption = { id: string; name: string };

export function OrderCustomerSelect({
  customers,
  canCreateCustomer,
}: {
  customers: CustomerOption[];
  canCreateCustomer: boolean;
}) {
  const [customerId, setCustomerId] = useState("");
  const [addedCustomer, setAddedCustomer] = useState<CustomerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const options = new Map(
    [...addedCustomer, ...customers].map((customer) => [customer.id, customer]),
  );

  function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    setError("");
    startTransition(async () => {
      try {
        const result = await quickCreateCustomer(name);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setAddedCustomer((previous) => [...previous, result]);
        setCustomerId(result.id);
        setOpen(false);
      } catch {
        setError("Could not add customer. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-48 flex-1">
        Customer
        <select
          required
          name="customerId"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        >
          <option value="">Select customer</option>
          {[...options.values()]
            .sort((first, second) => first.name.localeCompare(second.name))
            .map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
        </select>
      </label>
      {canCreateCustomer && (
        <Dialog.Root
          open={open}
          onOpenChange={(nextOpen) => {
            if (pending) return;
            setError("");
            setOpen(nextOpen);
          }}
        >
          <Dialog.Trigger type="button" className="rounded border px-3 py-2">
            Add New Customer
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-5 shadow-lg"
            >
              <Dialog.Title className="mb-4 font-semibold">
                Add New Customer
              </Dialog.Title>
              <form onSubmit={addCustomer} className="space-y-3">
                <label className="block">
                  Customer name
                  <input
                    name="name"
                    required
                    disabled={pending}
                    className="block w-full rounded border p-2"
                  />
                </label>
                {error && (
                  <p role="alert" className="text-red-700">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Dialog.Close
                    type="button"
                    disabled={pending}
                    className="rounded border px-3 py-2"
                  >
                    Cancel
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded bg-emerald-800 px-3 py-2 text-white disabled:opacity-50"
                  >
                    {pending ? "Adding…" : "Add customer"}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
