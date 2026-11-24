import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getShopBankAccounts, getShopInfo } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BankAccountDialog,
  DeleteBankAccountButton,
  MakePrimaryButton,
} from "./settings-forms";
import { SettingsForm } from "./settings-form";
import {
  AppearanceFields,
  BillFields,
  HoursFields,
  MessageFields,
  Panel,
  ProfileFields,
  RepairsFields,
} from "./sections";

export const metadata: Metadata = {
  title: "Settings",
};

const SECTIONS = [
  { key: "profile", title: "Shop profile", note: "Name, logo, contact, hours" },
  { key: "repairs", title: "Repairs", note: "Warranty, markup, repair numbers, common problems" },
  { key: "bills", title: "Bills and payments", note: "Bank accounts, bill text" },
  { key: "messages", title: "Customer messages", note: "WhatsApp texts you send" },
  { key: "appearance", title: "Appearance", note: "Light or dark, accent colour" },
  { key: "staff", title: "Staff and roles", note: "Who can do what" },
  { key: "account", title: "Account and security", note: "Your profile and password" },
  { key: "data", title: "Data", note: "Export repairs and customers" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

// Settings, as in the approved sample: a menu of sections on the left, the
// open section on the right, and a dark bar at the bottom while anything is
// unsaved. Each section saves only its own fields.
export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  await requirePermission("settings:write");
  const { section: requested } = await searchParams;
  const section: SectionKey =
    SECTIONS.find((s) => s.key === requested)?.key ?? "profile";
  const info = await getShopInfo();

  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_1fr] lg:items-start">
      <nav
        aria-label="Settings sections"
        className="min-w-0 rounded-[28px] bg-card p-3 lg:sticky lg:top-6"
      >
        <h1 className="font-display px-3 pt-2 pb-3 text-2xl font-extrabold">Settings</h1>
        <ul className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0">
          {SECTIONS.map((s) => {
            const active = s.key === section;
            return (
              <li key={s.key} className="shrink-0">
                <Link
                  href={`/admin/settings?section=${s.key}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 flex-col justify-center rounded-2xl px-3 py-2 transition-colors",
                    active ? "bg-primary/10" : "hover:bg-accent",
                  )}
                >
                  <span className="text-[15px] font-bold whitespace-nowrap lg:whitespace-normal">
                    {s.title}
                  </span>
                  <span className="hidden text-sm leading-snug text-muted-foreground lg:block">
                    {s.note}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 space-y-4 pb-24">
        {section === "profile" ? (
          <SettingsForm>
            <ProfileFields info={info} />
            <HoursFields week={info.weekHours} />
          </SettingsForm>
        ) : null}

        {section === "repairs" ? (
          <SettingsForm>
            <RepairsFields
              warrantyDays={info.warrantyDays}
              markupPercent={info.markupPercent}
              ticketPrefix={info.ticketPrefix}
              commonProblems={info.commonProblems}
            />
          </SettingsForm>
        ) : null}

        {section === "bills" ? (
          <>
            <BankAccounts />
            <SettingsForm>
              <BillFields billMessage={info.billMessage} shopName={info.name} />
            </SettingsForm>
          </>
        ) : null}

        {section === "messages" ? (
          <SettingsForm>
            <MessageFields msgReady={info.msgReady} msgLink={info.msgLink} shopName={info.name} />
          </SettingsForm>
        ) : null}

        {section === "appearance" ? (
          <SettingsForm>
            <AppearanceFields accentHue={info.accentHue} />
          </SettingsForm>
        ) : null}

        {section === "staff" ? <StaffSection /> : null}

        {section === "account" ? (
          <Panel title="Account and security" note="Your own name, email and password.">
            <Button asChild variant="secondary" size="lg">
              <Link href="/admin/profile">
                Open your profile <ArrowRight />
              </Link>
            </Button>
          </Panel>
        ) : null}

        {section === "data" ? (
          <Panel
            title="Data"
            note="Download your records as spreadsheet files (CSV). They open in Excel or Google Sheets."
          >
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="ink">
                <a href="/admin/export/repairs" download>
                  <Download /> Export repairs
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="/admin/export/customers" download>
                  <Download /> Export customers
                </a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Customers includes everyone with an account and every walk-in
              name and phone number from your repairs.
            </p>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

async function BankAccounts() {
  const accounts = await getShopBankAccounts();
  return (
    <Panel
      title="Bank accounts"
      note="Accounts customers can pay into. The first one is shown on unpaid bills; you can still pick another per bill."
      action={<BankAccountDialog />}
    >
      <ul className="space-y-3">
        {accounts.map((account, index) => {
          const primary = index === 0;
          return (
            <li
              key={account.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-secondary p-4"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{account.bankName}</p>
                  {primary ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      Shown on bills
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
                {accounts.length > 1 ? <DeleteBankAccountButton account={account} /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

async function StaffSection() {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return (
    <Panel
      title="Staff and roles"
      note="Admins can do everything. Staff can handle repairs, bills, payments and the shop, but cannot see money reports, manage customers or staff, delete repairs or change settings."
      action={
        <Button asChild variant="secondary">
          <Link href="/admin/staff">
            Manage staff <ArrowRight />
          </Link>
        </Button>
      }
    >
      <ul className="divide-y divide-border">
        {staff.map((person) => (
          <li key={person.id} className="flex items-center justify-between gap-3 py-3">
            <span className="font-semibold">{person.name}</span>
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold">
              {person.role === "ADMIN" ? "Admin" : "Staff"}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
