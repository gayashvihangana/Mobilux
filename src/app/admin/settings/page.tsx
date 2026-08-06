import type { Metadata } from "next";
import { Landmark, Store } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-guard";
import { getShopBankAccounts, getShopInfo } from "@/lib/settings";
import {
  BankAccountDialog,
  DeleteBankAccountButton,
  MakePrimaryButton,
  ShopInfoForm,
} from "./settings-forms";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  await requirePermission("settings:write");
  const [accounts, shopInfo] = await Promise.all([
    getShopBankAccounts(),
    getShopInfo(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Shop details used across the app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Store className="size-5 text-primary" /> Shop details
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Name, contact details and opening hours — shown on bills and in the
            messages customers receive.
          </p>
        </CardHeader>
        <CardContent>
          <ShopInfoForm info={shopInfo} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <Landmark className="size-5 text-primary" /> Bank accounts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Accounts customers can pay into. The default account is shown on
              unpaid bills — you can still override it per bill in the bill
              builder.
            </p>
          </div>
          <BankAccountDialog />
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {accounts.map((account, index) => {
              const primary = index === 0;
              return (
                <li
                  key={account.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card/50 p-4"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{account.bankName}</p>
                      {primary ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          Default on bills
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.accountName}
                      {account.branch ? ` · ${account.branch}` : ""}
                    </p>
                    <p className="font-mono text-sm">{account.accountNumber}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!primary ? <MakePrimaryButton id={account.id} /> : null}
                    <BankAccountDialog account={account} />
                    {accounts.length > 1 ? (
                      <DeleteBankAccountButton account={account} />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
