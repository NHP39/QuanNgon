import { lazy, Suspense, useEffect } from "react";
import { RouteStatus } from "./components/RouteStatus";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

const Login = lazy(() => import("./pages/Login"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));
const PasswordRecovery = lazy(() => import("./pages/PasswordRecovery"));
const CreateEatery = lazy(() => import("./pages/CreateEatery"));
const Explore = lazy(() => import("./pages/Explore"));
const Home = lazy(() => import("./pages/Home"));
const EateryDetail = lazy(() => import("./pages/EateryDetail"));
const Account = lazy(() => import("./pages/Account"));
const AdminEateries = lazy(() => import("./pages/AdminEateries"));
const AdminOverview = lazy(() => import("./pages/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminCategories = lazy(() => import("./pages/AdminCategories"));

function LegacyAdminPasswordRedirect() {
    useEffect(() => { window.location.replace("/account/password"); }, []);
    return <RouteStatus />;
}

function App() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    let page;
    if (path === "/" || path === "/home") page = <Home />;
    else if (path === "/login") page = <Login />;
    else if (path === "/verify-otp") page = <VerifyOtp />;
    else if (path === "/forgot-password") page = <PasswordRecovery />;
    else if (path === "/reset-password") page = <PasswordRecovery reset />;
    else if (path === "/eateries/new") page = <CreateEatery />;
    else if (path === "/admin" || path === "/admin/overview") page = <AdminOverview />;
    else if (path === "/admin/users") page = <AdminUsers />;
    else if (path === "/admin/eateries") page = <AdminEateries />;
    else if (path === "/admin/categories") page = <AdminCategories />;
    else if (path === "/admin/password") page = <LegacyAdminPasswordRedirect />;
    else if (/^\/account(?:\/password|\/eateries(?:\/[^/]+\/edit)?|\/favorites)?$/.test(path)) page = <Account />;
    else if (/^\/eateries\/\d+$/.test(path)) page = <EateryDetail />;
    else if (path === "/explore") page = <Explore />;
    else page = <RouteStatus notFound />;

    return <RouteErrorBoundary><Suspense fallback={<RouteStatus />}>{page}</Suspense></RouteErrorBoundary>;
}

export default App;
