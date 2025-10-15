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
  ApolloClient,
  NormalizedCacheShape,
} from "@apollo/client";
import { useRouter, usePathname } from "next/navigation";
import { IUser } from "@/models/User";

// Define the shape of the context
interface AuthContextType {
  user: IUser | null;
  isLoggedIn: boolean;
  loading: boolean; // Represents the login mutation loading state
  authLoading: boolean; // Represents the initial auth check loading state
  error?: string;
  login: (variables: any) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// GraphQL queries and mutations
const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      role
    }
  }
`;

const LOGIN_MUTATION = gql`
  mutation LoginUser($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        name
        email
        role
      }
    }
  }
`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Manages the initial auth check
  const router = useRouter();
  const pathname = usePathname();

  // We get the client instance from a hook that doesn't run its query immediately
  const { client } = useQuery(ME_QUERY, { skip: true });

  // Central, reusable logout function
  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
    }
    client.resetStore();
    router.push("/login");
  }, [client, router]);

  // This effect runs ONLY ONCE on initial application load to check for a token
  useEffect(() => {
    const checkUserStatus = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const { data } = await client.query({ query: ME_QUERY });
          if (data.me) {
            setUser(data.me);
          } else {
            // Token is present but invalid (server returned no user)
            logout();
          }
        } catch (error) {
          // Token is expired or malformed
          console.error("Authentication check failed:", error);
          logout();
        }
      } else {
        // No token, redirect to login if not already there
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
      setAuthLoading(false);
    };
    checkUserStatus();
  }, []); // The empty dependency array [] is crucial. This runs only once.

  // The login mutation logic, now centralized here
  const [loginMutation, { loading: loginLoading, error: loginError }] =
    useMutation(LOGIN_MUTATION, {
      onCompleted: (data) => {
        const { token, user: loggedInUser } = data.login;
        localStorage.setItem("authToken", token);
        setUser(loggedInUser);
        client.writeQuery({ query: ME_QUERY, data: { me: loggedInUser } });
        router.push("/");
      },
    });

  const login = useCallback(
    async (variables: any) => {
      return loginMutation(variables);
    },
    [loginMutation]
  );

  const isLoggedIn = !!user;

  // Prevent flashing of blank screen
  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Authenticating...
      </div>
    );
  }

  // Redirect if logged in but on /login
  if (isLoggedIn && pathname === "/login") {
    router.replace("/");
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Redirecting...
      </div>
    );
  }

  // Redirect to /login if not logged in and not already there
  if (!isLoggedIn && pathname !== "/login") {
    router.replace("/login");
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Redirecting...
      </div>
    );
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

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
