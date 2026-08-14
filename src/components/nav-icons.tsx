import {
  BarChart3,
  CreditCard,
  Gift,
  History,
  LayoutDashboard,
  NotebookPen,
  Package,
  Settings,
  ShoppingBag,
  Star,
  TriangleAlert,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

// Nav links are declared in server layouts, and a server component can't hand a
// function to a client one — so links carry an icon *name* and the client nav
// looks it up here.
export const NAV_ICONS = {
  overview: LayoutDashboard,
  repairs: Wrench,
  customers: Users,
  payments: CreditCard,
  products: Package,
  orders: ShoppingBag,
  loyalty: Gift,
  reviews: Star,
  reports: BarChart3,
  errors: TriangleAlert,
  notes: NotebookPen,
  activity: History,
  staff: UserCog,
  settings: Settings,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;

export function NavIcon({
  name,
  className,
}: {
  name: NavIconName;
  className?: string;
}) {
  const Icon = NAV_ICONS[name];
  return <Icon className={className} aria-hidden />;
}
