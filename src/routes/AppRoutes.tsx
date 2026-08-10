import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { toRouteObjects } from "@/routes/routeConfig";

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>{toRouteObjects().map((route) => <Route key={route.path} path={route.path} element={route.element} />)}</Routes>
    </Suspense>
  );
}

export default AppRoutes;
