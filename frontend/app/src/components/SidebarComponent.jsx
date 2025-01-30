"use client";

import { Sidebar } from "flowbite-react";
import {
  HiArrowSmRight,
  HiChartPie,
  HiInbox,
  HiShoppingBag,
  HiTable,
  HiUser,
} from "react-icons/hi";
import { useUserContext } from "../context/UserContext";

export function SidebarComponent() {
  const { user } = useUserContext();

  // Define sidebar items based on user role
  const items = {
    Patient: [
      { label: "Dashboard", href: "#", icon: HiChartPie },
      { label: "Appointments", href: "#", icon: HiInbox },
      { label: "Profile", href: "#", icon: HiUser },
    ],
    Doctor: [
      { label: "Dashboard", href: "#", icon: HiChartPie },
      { label: "Patients", href: "#", icon: HiUser },
      { label: "Schedule", href: "#", icon: HiTable },
    ],
    Admin: [
      { label: "Dashboard", href: "#", icon: HiChartPie },
      { label: "Manage Users", href: "#", icon: HiUser },
      { label: "Reports", href: "#", icon: HiShoppingBag },
    ],
  };

  // Render the sidebar
  return (
    <Sidebar aria-label="Dynamic Sidebar">
      <Sidebar.Items>
        <Sidebar.ItemGroup>
          {items[user.role]?.map((item, index) => (
            <Sidebar.Item key={index} href={item.href} icon={item.icon}>
              {item.label}
            </Sidebar.Item>
          ))}
          <Sidebar.Item href="#" icon={HiArrowSmRight}>
            Logout
          </Sidebar.Item>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}
