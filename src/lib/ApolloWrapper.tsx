"use client";

import { ApolloLink, HttpLink } from "@apollo/client";
import {
  ApolloNextAppProvider,
  NextSSRApolloClient,
  NextSSRInMemoryCache,
  SSRMultipartLink,
} from "@apollo/experimental-nextjs-app-support/ssr";
import { setContext } from '@apollo/client/link/context';

// This function creates a new Apollo Client instance. It's the core of our setup.
function makeClient() {
  const httpLink = new HttpLink({
    // The URI for your GraphQL API.
    uri: "/api/graphql",
  });

  // This is the new "middleware" link. It runs before every request.
  const authLink = setContext((_, { headers }) => {
    // Get the authentication token from local storage if it exists.
    // This code only runs on the client-side (in the browser).
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';
    
    // Return the headers to the context so httpLink can read them.
    // We add the authorization header if a token was found.
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      }
    }
  });

  // This function returns the final link chain for the Apollo Client.
  // It handles both server-side and client-side rendering.
  const link = typeof window === "undefined"
      ? ApolloLink.from([
          // In a server-side render, we use a multipart link for streaming.
          new SSRMultipartLink({
            stripDefer: true,
          }),
          // The authLink and httpLink are chained together.
          authLink.concat(httpLink),
        ])
      : authLink.concat(httpLink); // In the browser, we just chain auth and http.

  return new NextSSRApolloClient({
    cache: new NextSSRInMemoryCache(),
    link,
  });
}

// The ApolloWrapper component that you use in your layout.tsx file.
export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}

