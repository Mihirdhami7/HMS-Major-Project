import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../context/UserContext";

export default function Login() {
  const { setUser } = useUserContext();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("Patient"); // Default role
  const navigate = useNavigate();

  const handleLogin = () => {
    // Simulate login success and set user data
    setUser({ username, role });
    navigate("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <input
        className="p-2 border rounded mb-2"
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <select
        className="p-2 border rounded mb-4"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="Patient">Patient</option>
        <option value="Doctor">Doctor</option>
        <option value="Admin">Admin</option>
      </select>
      <button className="p-2 bg-blue-500 text-white rounded" onClick={handleLogin}>
        Login
      </button>
    </div>
  );
}
