import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <Card className="glass border-border/60 shadow-2xl shadow-primary/5">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">
          Reset your password
        </CardTitle>
        <CardDescription>
          We&apos;ll email you a 6-digit code to set a new password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
