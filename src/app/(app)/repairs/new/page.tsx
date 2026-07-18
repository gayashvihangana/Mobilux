import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewRepairForm } from "./new-repair-form";

export const metadata: Metadata = {
  title: "New repair request",
};

export default function NewRepairPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Start a repair request
          </CardTitle>
          <CardDescription>
            Tell us about your device and we&apos;ll log it, diagnose it, and keep
            you updated at every step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewRepairForm />
        </CardContent>
      </Card>
    </div>
  );
}
