import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}) {
  const { callbackUrl, reset } = await searchParams;

  return (
    <Card className="glass border-border/60 shadow-2xl shadow-primary/5">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Log in to track your repairs and manage your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reset ? (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            Password reset — log in with your new password.
          </div>
        ) : null}
        <LoginForm callbackUrl={callbackUrl} />
      </CardContent>
    </Card>
  );
}
