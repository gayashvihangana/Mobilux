"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import type { Product } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/forms/field-error";
import {
  createProduct,
  deleteProduct,
  setPhonesVisibility,
  updateProduct,
  type ProductFormState,
} from "@/lib/actions/products";

function useFormToast(
  state: ProductFormState,
  message: string,
  onSuccess?: () => void,
) {
  const last = useRef<ProductFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) {
        toast.success(message);
        onSuccess?.();
      } else if (state?.error) {
        toast.error(state.error);
      }
    }
    last.current = state;
  }, [state, message, onSuccess]);
}

export function ProductDialog({ product }: { product?: Product }) {
  const [open, setOpen] = useState(false);
  const editing = !!product;
  const [state, formAction, pending] = useActionState(
    editing ? updateProduct : createProduct,
    null,
  );
  useFormToast(
    state,
    editing ? "Product updated." : "Product created.",
    () => setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Edit {product.name}</span>
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> New product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form action={formAction} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={product.id} /> : null}
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${product.name}` : "New product"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update details, price, stock or images."
                : "Add an accessory or phone to the storefront."}
            </DialogDescription>
          </DialogHeader>

          {state?.error ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {state.error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={product?.name}
                placeholder="e.g. USB-C 30W Fast Charger"
                required
              />
              <FieldError errors={state?.fieldErrors?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={product?.category ?? "ACCESSORY"}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCESSORY">Accessory</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (LKR)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product ? product.price.toString() : ""}
                required
              />
              <FieldError errors={state?.fieldErrors?.price} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.stock ?? 0}
                required
              />
              <FieldError errors={state?.fieldErrors?.stock} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="visible"
                name="visible"
                defaultChecked={product?.visible ?? true}
              />
              <Label htmlFor="visible">Visible in shop</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={product?.description}
              placeholder="What is it, what's included, warranty…"
              required
              className="resize-none"
            />
            <FieldError errors={state?.fieldErrors?.description} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">
              Images{" "}
              <span className="text-muted-foreground">
                {editing ? "(leave empty to keep current)" : "(optional, up to 4)"}
              </span>
            </Label>
            <Input
              id="images"
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="cursor-pointer file:text-primary"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteProductButton({
  productId,
  name,
}: {
  productId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteProduct, null);
  useFormToast(state, "Product deleted.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete {name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={productId} />
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This can&apos;t be undone. Products with existing orders can&apos;t
              be deleted — hide them instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PhonesVisibilityToggle({ initial }: { initial: boolean }) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(initial);

  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
      <Switch
        checked={checked}
        disabled={pending}
        onCheckedChange={(value) => {
          setChecked(value);
          startTransition(async () => {
            await setPhonesVisibility(value);
            toast.success(
              value
                ? "Phones section is now visible in the shop."
                : "Phones section hidden from the shop.",
            );
          });
        }}
      />
      <span className="text-sm font-medium">Phones storefront</span>
    </label>
  );
}
