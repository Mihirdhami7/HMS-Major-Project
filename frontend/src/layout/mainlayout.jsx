import { useLocation } from "react-router-dom";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import Routers from "../routes/Routers";

// Logged-in areas use a full-height app layout (sidebar + scrolling content), so the
// public marketing footer is only shown on public pages (home, login, register, ...).
const APP_AREAS = ["/patient", "/doctor", "/admin", "/supplier", "/superadmin"];

const Layout = () => {
  const { pathname } = useLocation();
  const inAppArea = APP_AREAS.some((area) => pathname === area || pathname.startsWith(`${area}/`));

  return (
    <>
      <Header />
      <main>
        <Routers />
      </main>
      {!inAppArea && <Footer />}
    </>
  );
};

export default Layout;
