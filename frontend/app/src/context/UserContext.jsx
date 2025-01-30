import { createContext, useContext, useState } from "react";
import PropTypes from "prop-types";

// Create UserContext
const UserContext = createContext();

// Hook for accessing user context
export const useUserContext = () => useContext(UserContext);


// Provider for the context
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    role: "Patient", // Default role can be "Doctor", "Admin", or "Patient"
    username: "John Doe",
  });

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};


// PropTypes validation for the children prop
UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};