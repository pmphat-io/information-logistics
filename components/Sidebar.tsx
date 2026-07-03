"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Database, LayoutDashboard, PackageSearch } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Tổng quan",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Tra cứu hàng hóa",
      href: "/search",
      icon: Search,
    },
    {
      name: "Quản trị dữ liệu",
      href: "/admin",
      icon: Database,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <PackageSearch size={18} />
        </div>
        <div className="sidebar-title">
          <h1>LOGISTICS</h1>
          <span>Trợ lý nhập liệu</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
