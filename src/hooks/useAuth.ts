import { useAuth0 } from "@auth0/auth0-react";
import { clearWalletSessionStorage } from "@/hooks/walletSessionStorage";

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    error,
  } = useAuth0();

  return {
    user,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout: () => {
      clearWalletSessionStorage();
      logout({ logoutParams: { returnTo: window.location.origin } });
    },
    getAccessTokenSilently,
    error,
  };
}
