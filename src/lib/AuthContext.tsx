"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  useMutation,
  useQuery,
  gql,
  FetchResult,
} from "@apollo/client";
import { useRouter, usePathname } from "next/navigation";

// --- TypeScript Interfaces ---
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User';
}
interface LoginInput {
  email: string;
  password: string;
}
interface LoginData {
  login: {
    token: string;
    user: AuthUser;
  };
}
interface MeData {
  me: AuthUser;
}
interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  loading: boolean;
  authLoading: boolean;
  error?: string;
  login: (variables: { input: LoginInput }) => Promise<FetchResult<LoginData>>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- GraphQL ---
const ME_QUERY = gql`
  query Me {
    me { id name email role }
  }
`;
const LOGIN_MUTATION = gql`
  mutation LoginUser($input: LoginInput!) {
    login(input: $input) {
      token
      user { id name email role }
    }
  }
`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const { client } = useQuery<MeData>(ME_QUERY, { skip: true });

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
    }
    client.resetStore();
    router.push("/login");
  }, [client, router]);

  // Effect for initial authentication check (runs once)
  useEffect(() => {
    const checkUserStatus = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const { data } = await client.query<MeData>({ query: ME_QUERY });
          if (data.me) {
            setUser(data.me);
          } else {
            logout();
          }
        } catch (error) {
          console.error("Authentication check failed:", error);
          logout();
        }
      }
      setAuthLoading(false);
    };
    checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [loginMutation, { loading: loginLoading, error: loginError }] =
    useMutation<LoginData, { input: LoginInput }>(LOGIN_MUTATION, {
      onCompleted: (data) => {
        const { token, user: loggedInUser } = data.login;
        localStorage.setItem("authToken", token);
        setUser(loggedInUser);
        client.writeQuery<MeData>({ query: ME_QUERY, data: { me: loggedInUser } });
        router.push("/");
      },
    });

  const login = useCallback(
    async (variables: { input: LoginInput }) => {
      return loginMutation({ variables });
    },
    [loginMutation]
  );

  const isLoggedIn = !!user;

  // --- THIS IS THE FIX ---
  // This new useEffect handles all redirection logic.
  // It runs AFTER the component renders and only when its dependencies change.
  useEffect(() => {
    // Don't do anything until the initial authentication check is complete
    if (authLoading) {
      return;
    }

    // If the user is logged in but is on the login page, redirect to home.
    if (isLoggedIn && pathname === "/login") {
      router.replace("/");
    }

    // If the user is NOT logged in and is NOT on the login page, redirect to login.
    if (!isLoggedIn && pathname !== "/login") {
      router.replace("/login");
    }
  }, [isLoggedIn, authLoading, pathname, router]);


  // While checking auth, show a global loading screen.
  // This is safe to keep in the render body.
  if (authLoading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Authenticating...</div>;
  }

  // If we are on a protected page and not logged in, we show a "Redirecting..."
  // message while the useEffect above does its work.
  if (!isLoggedIn && pathname !== "/login") {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Redirecting...</div>;
  }

  // If we are logged in but on the login page, show a "Redirecting..." message.
  if (isLoggedIn && pathname === "/login") {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Redirecting...</div>;
  }
  
  const value = {
    user,
    isLoggedIn,
    loading: loginLoading,
    authLoading,
    error: loginError?.message,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};