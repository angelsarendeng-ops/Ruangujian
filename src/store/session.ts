import { create } from "zustand";
import type { User } from "../db/database";
interface SessionStore {
  user: User | null;
  setUser: (user: User | null) => void;
}
export const useSession = create<SessionStore>((set) => ({
  user: JSON.parse(sessionStorage.getItem("cbt-session") || "null"),
  setUser: (user) => {
    if (user) {
      const { passwordHash, salt, ...safe } = user;
      sessionStorage.setItem("cbt-session", JSON.stringify(safe));
      set({ user: safe as User });
    } else {
      sessionStorage.removeItem("cbt-session");
      set({ user: null });
    }
  },
}));
