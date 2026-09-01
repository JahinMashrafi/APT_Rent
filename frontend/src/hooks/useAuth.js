import { useEffect, useState } from "react";
import { fetchCurrentUser } from "../utils/auth";

export default function useAuth() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const user = await fetchCurrentUser();

        if (mounted && user?.id) {
          setAuthState({
            isAuthenticated: true,
            user,
            isLoading: false,
          });
          return;
        }
      } catch {
        // A missing or invalid cookie means the user is signed out.
      }

      if (mounted) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    }

    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  return authState;
}
