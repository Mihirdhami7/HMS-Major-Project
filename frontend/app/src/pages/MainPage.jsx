import { SidebarComponent } from "../components/SidebarComponent";

export default function Dashboard() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <SidebarComponent />
      {/* Main Content */}
      <div className="p-4 w-full">
        <h1 className="text-2xl font-bold">Welcome to the Dashboard</h1>
        <p>This is the main content area for the dashboard.</p>
      </div>
    </div>
  );
}
