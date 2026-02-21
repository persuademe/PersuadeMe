"use client";

import { useEffect, useState } from 'react';
import { sdk, SdkProvider } from '@farcaster/miniapp-sdk';

interface FarCastUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

export default function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [farcasterUser, setFarcasterUser] = useState<FarCastUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize the mini-app
    const initMiniApp = async () => {
      try {
        // Check if running in Farcaster mini-app context
        const context = await sdk.context;
        
        if (context && context.user) {
          // User is authenticated via Farcaster
          setFarcasterUser({
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
          });
          
          console.log('[Farcaster] User authenticated:', context.user);
        } else {
          console.log('[Farcaster] Not running in mini-app context');
        }
      } catch (error) {
        console.log('[Farcaster] Not in Farcaster context:', error);
      } finally {
        // Signal that app is ready to display
        try {
          await sdk.actions.ready();
          console.log('[Farcaster] Mini-app ready');
        } catch (e) {
          // Not in mini-app context
        }
        setIsLoading(false);
      }
    };

    initMiniApp();

    // Handle visibility changes (minimize/restore)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sdk.actions.minimize();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Expose farcaster user info to window for other components
  useEffect(() => {
    if (farcasterUser) {
      (window as any).__FARCASTER_USER__ = farcasterUser;
    }
  }, [farcasterUser]);

  return (
    <SdkProvider>
      {children}
    </SdkProvider>
  );
}

// Helper hook to get Farcaster user
export function useFarcasterUser() {
  const [user, setUser] = useState<FarCastUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const context = await sdk.context;
        if (context?.user) {
          setUser({
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
          });
        }
      } catch (e) {
        // Not in mini-app
      }
      setIsLoading(false);
    };

    checkUser();
  }, []);

  return { user, isLoading };
}

// Export SDK for direct access
export { sdk };
