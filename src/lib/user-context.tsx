"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import type { Profile } from "@/lib/types";

interface UserContextType {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  updateProfile: (data: Partial<Profile>) => void;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  isAdmin: false,
  updateProfile: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemo = mockStore.isDemoMode();

  useEffect(() => {
    if (isDemo) {
      setProfile(mockStore.getUser());
      setLoading(false);
      return;
    }

    const supabase = createClient();
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, [isDemo]);

  function updateProfile(data: Partial<Profile>) {
    setProfile((prev) => (prev ? { ...prev, ...data } : prev));
  }

  return (
    <UserContext.Provider
      value={{
        profile,
        loading,
        isAdmin: profile?.role === "admin",
        updateProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
