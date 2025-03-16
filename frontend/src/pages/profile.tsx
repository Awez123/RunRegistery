import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ProfileType {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_SERVER_URL;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(API_URL+"/profile", {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        if (response.ok) {
          setProfile(data.profile);
        } else {
          setError(data.error || "Failed to fetch profile");
        }
      } catch (error) {
        setError("Failed to fetch profile");
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (error) {
    return <div className="text-red-500 text-center mt-4">Error: {error}</div>;
  }

  if (!profile) {
    return <div className="text-center mt-4">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Profile</h1>
      <div className="space-y-4">
        <p>
          <strong>ID:</strong> {profile.id}
        </p>
        <p>
          <strong>Username:</strong> {profile.username}
        </p>
        <p>
          <strong>Email:</strong> {profile.email}
        </p>
        <p>
          <strong>Created At:</strong>{" "}
          {new Date(profile.created_at).toLocaleString()}
        </p>
      </div>
      <button
        className="mt-6 w-full py-2 px-4 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
};

export default Profile;
