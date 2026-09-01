import AdminPage from "../pages/AdminPage.jsx";

export default function AppShell({ children, session }) {
  const adminPath = typeof window !== "undefined" && window.location.pathname === "/admin";
  if (adminPath) {
    return <AdminPage session={session} />;
  }
  return children;
}
