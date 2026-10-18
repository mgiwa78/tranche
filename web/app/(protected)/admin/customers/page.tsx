"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AccountStatus, AdminRole, hasAdminRole, toKobo, updateCustomerSchema, validateWith } from "@tranche/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatDate, formatNaira, fromKobo } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import { useAppSelector } from "@/store/hooks";
import { selectAdminRole } from "@/store/selectors/authSelectors";
import { useListAdminCustomersQuery, useUpdateAdminCustomerMutation } from "@/store/rtk/adminSlice/adminSlices";
import type { AdminCustomerView } from "@/types/global";

type Row = AdminCustomerView & Record<string, unknown>;

export default function AdminCustomersPage() {
  const role = useAppSelector(selectAdminRole);
  const confirm = useConfirm();
  const limitModal = useRef<ModalHandle>(null);
  const list = useListParams({ status: "" });
  const { data, isFetching } = useListAdminCustomersQuery(list.query as never);
  const [update, { isLoading }] = useUpdateAdminCustomerMutation();
  const [editing, setEditing] = useState<AdminCustomerView | null>(null);
  const [limit, setLimit] = useState("");
  const [limitError, setLimitError] = useState<string>();

  async function saveLimit() {
    if (!editing) return;
    const result = validateWith(updateCustomerSchema, { creditLimitKobo: toKobo(Number(limit.replace(/,/g, ""))) });
    if (!result.ok) return setLimitError(result.errors.creditLimitKobo);
    try {
      await update({ id: editing.id, body: result.data }).unwrap();
      toast.success("Credit limit updated");
      limitModal.current?.close();
    } catch {
      /* toasted */
    }
  }

  async function toggleStatus(row: Row) {
    const suspend = row.status === AccountStatus.ACTIVE;
    if (suspend) {
      const ok = await confirm({
        title: `Suspend ${row.name}?`,
        message: "They'll be signed out everywhere and can't place new orders. Existing plans keep collecting.",
        confirmLabel: "Suspend",
        tone: "danger",
      });
      if (!ok) return;
    }
    try {
      await update({ id: row.id, body: { status: suspend ? AccountStatus.SUSPENDED : AccountStatus.ACTIVE } }).unwrap();
      toast.success(suspend ? "Customer suspended" : "Customer reactivated");
    } catch {
      /* toasted */
    }
  }

  return (
    <div>
      <PageHeader title="Customers" subtitle="Shoppers, their spending limits and what they owe." />

      <Modal
        ref={limitModal}
        title="Credit limit"
        description={editing ? `How much ${editing.name} can have outstanding.` : undefined}
      >
        <div className="flex flex-col gap-4">
          <Input
            id="limit"
            label="Limit (₦)"
            inputMode="decimal"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            error={limitError}
          />
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => limitModal.current?.close()}>
              Cancel
            </Button>
            <Button size="sm" loading={isLoading} onClick={saveLimit}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <DynamicTable<Row>
        data={(data?.data ?? []) as Row[]}
        isLoading={isFetching && !data}
        rowKey="id"
        search={{ value: list.searchInput, placeholder: "Search name, email or phone…", onChange: list.setSearchInput }}
        filters={[
          {
            name: "Status",
            value: list.params.status,
            options: [
              { label: "All statuses", value: "" },
              { label: "Active", value: AccountStatus.ACTIVE },
              { label: "Suspended", value: AccountStatus.SUSPENDED },
            ],
            onChange: (v) => list.setFilter("status", v),
          },
        ]}
        pagination={{
          page: list.params.page,
          limit: list.params.limit,
          totalPages: data?.meta.totalPages ?? 1,
          totalItems: data?.meta.total,
          onPageChange: list.setPage,
        }}
        actions={
          hasAdminRole(role, AdminRole.ADMIN)
            ? [
                {
                  label: "Change credit limit",
                  onClick: (r) => {
                    setEditing(r);
                    setLimit(String(fromKobo(r.creditLimitKobo)));
                    setLimitError(undefined);
                    limitModal.current?.open();
                  },
                },
                {
                  label: "Suspend",
                  tone: "danger",
                  allowed: (r) => r.status === AccountStatus.ACTIVE,
                  onClick: toggleStatus,
                },
                { label: "Reactivate", allowed: (r) => r.status === AccountStatus.SUSPENDED, onClick: toggleStatus },
              ]
            : undefined
        }
        columns={[
          {
            header: "Shopper",
            accessor: "name",
            render: (v, row) => (
              <span>
                <span className="block font-medium text-ink">{String(v)}</span>
                <span className="block text-xs text-faint">{row.email}</span>
              </span>
            ),
          },
          { header: "Status", accessor: "status", render: (v) => <Badge type="ACCOUNT_STATUS">{String(v)}</Badge> },
          { header: "Orders", accessor: "ordersCount", render: (v) => <span className="tnum">{String(v)}</span> },
          {
            header: "Outstanding",
            accessor: "outstandingKobo",
            render: (v) => <span className="tnum">{formatNaira(Number(v))}</span>,
          },
          {
            header: "Limit",
            accessor: "creditLimitKobo",
            render: (v) => <span className="tnum text-muted">{formatNaira(Number(v))}</span>,
          },
          { header: "Joined", accessor: "createdAt", render: (v) => formatDate(String(v)) },
        ]}
      />
    </div>
  );
}
