// The three well-known logins on the demo instance. Deliberately public —
// they're printed on the sign-in buttons themselves — so this file must stay
// free of anything server-only: it's imported by a client component
// (demo-login-buttons.tsx) as well as by prisma/demo-data.ts, which is what
// keeps the seeded accounts and the buttons from ever drifting apart.

export const DEMO_ACCOUNTS = {
  owner: {
    email: "owner@demo.mobilux.lk",
    password: "MobiluxDemo1!",
    name: "Priya Fernando",
    label: "Shop owner",
  },
  staff: {
    email: "technician@demo.mobilux.lk",
    password: "MobiluxDemo1!",
    name: "Nuwan Perera",
    label: "Technician",
  },
  customer: {
    email: "customer@demo.mobilux.lk",
    password: "MobiluxDemo1!",
    name: "Ishara Jayasuriya",
    label: "Customer",
  },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;
