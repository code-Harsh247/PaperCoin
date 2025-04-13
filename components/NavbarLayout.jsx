// app/components/NavbarLayout.js
"use client";
import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";

export default function NavbarLayout() {
  // const signOut = useAuthStore();
  const pathname = usePathname();
  const renderNavbar = pathname !== "/"; // Don't render Navbar on the home page

  return renderNavbar ? <Navbar /> : null;
}
