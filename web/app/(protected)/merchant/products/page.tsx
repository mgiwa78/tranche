"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  MAX_PRODUCT_PRICE_KOBO,
  ProductCategory,
  buildInstallmentSchedule,
  createProductSchema,
  toKobo,
  validateWith,
  PlanCode,
} from "@tranche/shared";
import { PRODUCT_CATEGORY_LABELS } from "@/constants/enums";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatNaira, fromKobo } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import {
  useCreateMerchantProductMutation,
  useDeleteMerchantProductMutation,
  useListMerchantProductsQuery,
  useUpdateMerchantProductMutation,
} from "@/store/rtk/merchantSlice/merchantSlices";
import type { ProductView } from "@/types/global";

type Row = ProductView & Record<string, unknown>;

interface Draft {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  stock: string;
  isActive: boolean;
}

const EMPTY: Draft = { name: "", description: "", price: "", category: "", imageUrl: "", stock: "10", isActive: true };

const CATEGORY_OPTIONS = Object.values(ProductCategory).map((c) => ({ label: PRODUCT_CATEGORY_LABELS[c], value: c }));

/** Naira text input -> kobo for the shared schema (which validates kobo, like the api). */
const toPayload = (d: Draft) => ({
  name: d.name,
  description: d.description,
  priceKobo: d.price.trim() === "" ? Number.NaN : toKobo(Number(d.price.replace(/,/g, ""))),
  category: d.category,
  imageUrl: d.imageUrl.trim() || null,
  stock: Number(d.stock),
  isActive: d.isActive,
});

export default function MerchantProductsPage() {
  const modal = useRef<ModalHandle>(null);
  const confirm = useConfirm();
  const list = useListParams({ category: "", isActive: "" });
  const { data, isFetching } = useListMerchantProductsQuery(list.query as never);
  const [create, { isLoading: creating }] = useCreateMerchantProductMutation();
  const [update, { isLoading: updating }] = useUpdateMerchantProductMutation();
  const [remove] = useDeleteMerchantProductMutation();

  const [editing, setEditing] = useState<ProductView | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openNew() {
    setEditing(null);
    setDraft(EMPTY);
    setErrors({});
    modal.current?.open();
  }

  function openEdit(p: ProductView) {
    setEditing(p);
    setDraft({
      name: p.name,
      description: p.description,
      price: String(fromKobo(p.priceKobo)),
      category: p.category,
      imageUrl: p.imageUrl ?? "",
      stock: String(p.stock),
      isActive: p.isActive,
    });
    setErrors({});
    modal.current?.open();
  }

  async function save() {
    const result = validateWith(createProductSchema, toPayload(draft));
    if (!result.ok) {
      const e: Record<string, string> = { ...result.errors };
      if (e.priceKobo) e.price = draft.price ? e.priceKobo.replace("kobo", "naira") : "Price is required";
      return setErrors(e);
    }
    setErrors({});
    try {
      if (editing) await update({ id: editing.id, body: result.data }).unwrap();
      else await create(result.data).unwrap();
      toast.success(editing ? "Product updated" : "Product added");
      modal.current?.close();
    } catch {
      /* toasted by errorMiddleware */
    }
  }

  async function handleDelete(p: ProductView) {
    const ok = await confirm({
      title: "Delete product?",
      message: `${p.name} will be removed from the catalog. Past orders keep their snapshot.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove(p.id).unwrap();
      toast.success("Product deleted");
    } catch {
      /* toasted */
    }
  }

  const previewKobo = toPayload(draft).priceKobo;
  const preview =
    Number.isFinite(previewKobo) && previewKobo > 0 && previewKobo <= MAX_PRODUCT_PRICE_KOBO
      ? buildInstallmentSchedule(previewKobo, PlanCode.PAY_IN_4, new Date())
      : null;
  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="What shoppers can buy with Tranche in your store."
        actions={<Button onClick={openNew}>Add product</Button>}
      />

      <Modal
        ref={modal}
        title={editing ? "Edit product" : "Add product"}
        description="Prices are in naira. Shoppers see the 4-payment split on every product."
      >
        <div className="flex flex-col gap-4">
          <Input id="p-name" label="Name" value={draft.name} onChange={set("name")} error={errors.name} />
          <Textarea
            id="p-description"
            label="Description"
            rows={3}
            value={draft.description}
            onChange={set("description")}
            error={errors.description}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="p-price"
              label="Price (₦)"
              inputMode="decimal"
              value={draft.price}
              onChange={set("price")}
              error={errors.price}
              hint={preview ? `4 × ${formatNaira(preview[1].amountKobo)}` : undefined}
            />
            <Input
              id="p-stock"
              label="Stock"
              inputMode="numeric"
              value={draft.stock}
              onChange={set("stock")}
              error={errors.stock}
            />
          </div>
          <Select
            id="p-category"
            label="Category"
            value={draft.category}
            onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
            options={CATEGORY_OPTIONS}
            placeholder="Choose a category"
            isSearchable={false}
            error={errors.category}
          />
          <Input
            id="p-image"
            label="Image URL"
            hint="Optional, square works best"
            value={draft.imageUrl}
            onChange={set("imageUrl")}
            error={errors.imageUrl}
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Listed in the Tranche app
          </label>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => modal.current?.close()}>
              Cancel
            </Button>
            <Button size="sm" loading={creating || updating} onClick={save}>
              {editing ? "Save changes" : "Add product"}
            </Button>
          </div>
        </div>
      </Modal>

      <DynamicTable<Row>
        data={(data?.data ?? []) as Row[]}
        isLoading={isFetching && !data}
        rowKey="id"
        emptyMessage="No products yet. Add your first product to start selling with Tranche."
        viewAction={(row) => openEdit(row)}
        search={{ value: list.searchInput, placeholder: "Search products…", onChange: list.setSearchInput }}
        filters={[
          {
            name: "Category",
            value: list.params.category,
            options: [{ label: "All categories", value: "" }, ...CATEGORY_OPTIONS],
            onChange: (v) => list.setFilter("category", v),
          },
          {
            name: "Visibility",
            value: list.params.isActive,
            options: [
              { label: "Listed and hidden", value: "" },
              { label: "Listed", value: "true" },
              { label: "Hidden", value: "false" },
            ],
            onChange: (v) => list.setFilter("isActive", v),
          },
        ]}
        pagination={{
          page: list.params.page,
          limit: list.params.limit,
          totalPages: data?.meta.totalPages ?? 1,
          totalItems: data?.meta.total,
          onPageChange: list.setPage,
        }}
        actions={[
          { label: "Edit", onClick: (row) => openEdit(row) },
          {
            label: "Hide from app",
            allowed: (row) => row.isActive,
            onClick: (row) => update({ id: row.id, body: { isActive: false } }),
          },
          {
            label: "List in app",
            allowed: (row) => !row.isActive,
            onClick: (row) => update({ id: row.id, body: { isActive: true } }),
          },
          { label: "Delete", tone: "danger", onClick: (row) => handleDelete(row) },
        ]}
        columns={[
          {
            header: "Product",
            accessor: "name",
            render: (v, row) => (
              <span className="flex items-center gap-3">
                {row.imageUrl ? (
                  <img src={row.imageUrl} alt="" className="h-9 w-9 rounded-control object-cover" />
                ) : (
                  <span className="h-9 w-9 rounded-control bg-canvas-subtle" />
                )}
                <span className="font-medium text-ink">{String(v)}</span>
              </span>
            ),
          },
          {
            header: "Category",
            accessor: "category",
            render: (v) => PRODUCT_CATEGORY_LABELS[v as ProductCategory],
          },
          {
            header: "Price",
            accessor: "priceKobo",
            render: (v) => <span className="tnum">{formatNaira(Number(v))}</span>,
          },
          {
            header: "Per payment",
            accessor: "priceKobo",
            render: (v) => (
              <span className="tnum text-muted">
                {formatNaira(buildInstallmentSchedule(Number(v), PlanCode.PAY_IN_4, new Date())[1].amountKobo)}
              </span>
            ),
          },
          { header: "Stock", accessor: "stock", render: (v) => <span className="tnum">{String(v)}</span> },
          {
            header: "Visibility",
            accessor: "isActive",
            render: (v) => <Badge type="PRODUCT_ACTIVE">{String(v)}</Badge>,
          },
        ]}
      />
    </div>
  );
}
