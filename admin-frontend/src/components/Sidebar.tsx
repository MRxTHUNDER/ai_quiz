import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Upload, BookOpen, Users } from "lucide-react";

const navigation = [
  {
    name: "Users",
    href: "/users",
    icon: Users,
  },
  {
    name: "Upload PDF",
    href: "/upload-pdf",
    icon: Upload,
  },
  {
    name: "Exams & Subjects",
    href: "/exams",
    icon: BookOpen,
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href === "/users" && location.pathname.startsWith("/users"));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
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
