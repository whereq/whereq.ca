import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import type { AuthContextType } from "@/contexts/AuthContextTypes";

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider.\n' +
      'Current component stack:\n' +
      new Error().stack?.replace(/^Error\n/, '')
    );
  }
  
  return context;
};