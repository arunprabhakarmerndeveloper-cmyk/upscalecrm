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
  FetchResult,
} from "@apollo/client";
import { useRouter, usePathname } from "next/navigation";

// --- TypeScript Interfaces ---

// It's best practice to define the user shape for your frontend here.
// This can be exported and used in other components like Header.tsx.
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User';
}

// Defines the shape of the variables for the login mutation
interface LoginInput {
  email: string;
  password: string;
}

// Defines the shape of the data returned by the LOGIN_MUTATION
interface LoginData {
  login: {
    token: string;
    user: AuthUser;
  };
}

// Defines the shape of the data returned by the ME_QUERY
interface MeData {
  me: AuthUser;
}

// Define the final, fully-typed shape of the context
interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  loading: boolean; // Represents the login mutation loading state
  authLoading: boolean; // Represents the initial auth check loading state
  error?: string;
  // The login function now has a precise signature
  login: (variables: { input: LoginInput }) => Promise<FetchResult<LoginData>>;
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

  useEffect(() => {
    const checkUserStatus = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          // Type the client.query call
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
      } else {
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
      setAuthLoading(false);
    };
    checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // The empty array is correct here for a one-time check

  // Type the useMutation hook
  const [loginMutation, { loading: loginLoading, error: loginError }] =
    useMutation<LoginData, { input: LoginInput }>(LOGIN_MUTATION, {
      onCompleted: (data) => {
        const { token, user: loggedInUser } = data.login;
        localStorage.setItem("authToken", token);
        setUser(loggedInUser);
        // Type the client.writeQuery call
        client.writeQuery<MeData>({ query: ME_QUERY, data: { me: loggedInUser } });
        router.push("/");
      },
    });

  // Type the variables for the login function
  const login = useCallback(
    async (variables: { input: LoginInput }) => {
      return loginMutation({ variables });
    },
    [loginMutation]
  );

  const isLoggedIn = !!user;

  if (authLoading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Authenticating...</div>;
  }
  if (isLoggedIn && pathname === "/login") {
    router.replace("/");
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Redirecting...</div>;
  }
  if (!isLoggedIn && pathname !== "/login") {
    router.replace("/login");
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