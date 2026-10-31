import { Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useRoutes, type Location } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { toRouteObjects } from "@/routes/routeConfig";

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
  </div>
);

function RouteView({ routeObjects, location }: { routeObjects: ReturnType<typeof toRouteObjects>; location: Location }) {
  return useRoutes(routeObjects, location);
}

function CachedRouteView({
  routeObjects,
  location,
  active
}: {
  routeObjects: ReturnType<typeof toRouteObjects>;
  location: Location;
  active: boolean;
}) {
  return (
    <div hidden={!active} aria-hidden={!active}>
      <Suspense fallback={<LoadingScreen />}>
        <RouteView routeObjects={routeObjects} location={location} />
      </Suspense>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const routeObjects = useMemo(() => toRouteObjects(), []);
  const [visitedPaths, setVisitedPaths] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setVisitedPaths([location.pathname]);
      return;
    }
    setVisitedPaths((paths) => paths.includes(location.pathname) ? paths : [...paths, location.pathname]);
  }, [isAuthenticated, location.pathname]);

  const paths = isAuthenticated
    ? [...new Set([...visitedPaths, location.pathname])].filter((path) => path === location.pathname || path !== "/auth")
    : [location.pathname];

  return (
    <>
      {paths.map((path) => {
        const active = path === location.pathname;
        const routeLocation: Location = active
          ? location
          : { pathname: path, search: "", hash: "", state: null, key: path };
        return (
          <CachedRouteView
            key={path}
            routeObjects={routeObjects}
            location={routeLocation}
            active={active}
          />
        );
      })}
    </>
  );
}

export default AppRoutes;
