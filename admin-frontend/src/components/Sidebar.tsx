import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Upload, BookOpen, Users, Palette } from "lucide-react";

const navigation = [
  {
    name: "Users",
    href: "/users",
    icon: Users,
  },
  {
    name: "Questions",
    href: "/questions",
    icon: Upload,
  },
  {
    name: "Exams & Subjects",
    href: "/exams",
    icon: BookOpen,
  },
  {
    name: "UI Management",
    href: "/ui-management",
    icon: Palette,
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            location.pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
