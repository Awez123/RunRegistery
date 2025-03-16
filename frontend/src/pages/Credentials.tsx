import { useEffect, useState } from "react";

// Define Token interface
interface Token {
  token_id: string;
  token: string;
  created_by: string;
  expires_at: string;
}

export default function TokenManager() {
  const API_URL = import.meta.env.VITE_SERVER_URL;
  const [tokens, setTokens] = useState<Token[]>([]);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const getAuthToken = () => localStorage.getItem("token");

  const fetchTokens = async () => {
    try {
      const response = await fetch(API_URL+"/get-all-tokens", {
        method: "GET",
        headers: {
          Authorization: `${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      });
      const data: { tokens: Token[] } = await response.json();
      setTokens(data.tokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const showAlert = (message: string, type: "success" | "error") => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const deleteToken = async (token_id: string) => {
    try {
      await fetch(`${API_URL}/delete-token/${token_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      });
      setTokens((prevTokens) => prevTokens.filter((token) => token.token_id !== token_id));
      showAlert("Token deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting token:", error);
      showAlert("Failed to delete token!", "error");
    }
  };

  const generateToken = async () => {
    try {
      const response = await fetch(API_URL+"/generate-token", {
        method: "POST",
        headers: {
          Authorization: `${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      });
      const data: { token: Token } = await response.json();
      setTokens((prevTokens) => [...prevTokens, data.token]);
      showAlert("New token generated successfully!", "success");
    } catch (error) {
      console.error("Error generating token:", error);
      showAlert("Failed to generate token!", "error");
    }
  };

  return (
    <div className="w-full mx-auto mt-6 p-6 bg-gradient-to-br from-gray-100 to-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6 text-center">🔑 Token Manager</h1>

      {/* Alert Box */}
      {alert && (
        <div
          className={`mb-4 p-3 text-center font-semibold rounded-lg ${
            alert.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {alert.message}
        </div>
      )}

      {/* Rounded Table */}
      <div className="overflow-hidden rounded-xl shadow-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white text-lg font-semibold">
              <th className="p-4 first:rounded-tl-xl last:rounded-tr-xl">Token ID</th>
              <th className="p-4">Token</th>
              <th className="p-4">Created By</th>
              <th className="p-4">Expires At</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token, index) => (
              <tr
                key={token.token_id}
                className={`text-center text-gray-700 text-md ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-100"
                } hover:bg-gray-200 transition`}
              >
                <td className="p-4">{token.token_id}</td>
                <td className="p-4 text-xs break-all text-gray-700">{token.token}</td>
                <td className="p-4">{token.created_by}</td>
                <td className="p-4">{new Date(token.expires_at).toLocaleString()}</td>
                <td className="p-4">
                  <button
                    onClick={() => deleteToken(token.token_id)}
                    className="bg-red-500 text-white px-5 py-2 rounded-full font-medium hover:bg-red-600 transition duration-300 shadow-md"
                  >
                    ❌ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generate Token Button */}
      <button
        onClick={generateToken}
        className="mt-6 w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:from-blue-600 hover:to-blue-800 transition duration-300"
      >
        ➕ Generate Token
      </button>
    </div>
  );
}
