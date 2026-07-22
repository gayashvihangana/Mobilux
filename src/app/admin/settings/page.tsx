import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getShopPayTo } from "@/lib/settings";
import { ShopBankForm } from "./settings-forms";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const payTo = await getShopPayTo();

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
            <Landmark className="size-5 text-primary" /> Bank account details
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            The default &ldquo;pay to&rdquo; account shown on unpaid bills. You
            can still override these per bill in the bill builder.
          </p>
        </CardHeader>
        <CardContent>
          <ShopBankForm payTo={payTo} />
        </CardContent>
      </Card>
    </div>
  );
}
