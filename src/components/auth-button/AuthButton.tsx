import { useState } from "react";
import { useAuth } from "@/hooks/userAuth"; // Updated import path
import keycloak from "@/services/keycloak";

export const AuthButton = () => {
  const { isAuthenticated, isLoading, login, logout, register } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = () => {
    logout();
    setShowMenu(false);
  };

  if (isLoading) {
    return (
      <button className="bg-gray-500 text-white px-4 py-2 rounded-md animate-pulse">
        Loading...
      </button>
    );
  }

  return (
    <div className="relative">
      {!isAuthenticated ? (
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          onClick={() => setShowMenu(!showMenu)}
        >
          Sign In / Sign Up
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-white">{keycloak.tokenParsed?.preferred_username}</span>
          <img
            src={keycloak.tokenParsed?.picture || "https://via.placeholder.com/32"}
            alt="Profile"
            className="w-10 h-10 rounded-full cursor-pointer"
            onClick={() => setShowMenu(!showMenu)}
          />
        </div>
      )}

      {showMenu && (
        <div className="absolute right-0 mt-2 bg-gray-800 shadow-lg rounded-lg w-48 p-2 border border-gray-700 z-50">
          {!isAuthenticated ? (
            <>
              <button
                className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 text-white"
                onClick={login}
              >
                Sign In
              </button>
              <button
                className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 text-white mt-2"
                onClick={register}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <button
                className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 text-white"
                onClick={() => keycloak.accountManagement()}
              >
                Account Details
              </button>
              <button
                className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 text-white mt-2"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};