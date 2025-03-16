import { useEffect, useState } from "react";
import icon from "../assets/icon.png";
import Credentials from "./Credentials";
import Profile from "./profile";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("images");
  const [images, setImages] = useState([]);
  const API_URL = import.meta.env.VITE_SERVER_URL;
  useEffect(() => {
    if (activeTab === "images") {
      fetchImages();
    }
  }, [activeTab]);

  const fetchImages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL+"/images", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setImages(data.images);
      } else {
        console.error(data.error || "Failed to fetch images");
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-md p-2 flex justify-between items-center">
        <div className="flex space-x-6">
          <div className="flex items-center justify-center">
            <img src={icon} alt="Logo" className="w-16 h-16" />
          </div>
          <button
            className={`px-4 py-2 rounded-md ${activeTab === "images" ? "text-red-400 font-bold" : "text-gray-700"
              }`}
            onClick={() => setActiveTab("images")}
          >
            Images
          </button>
          <button
            className={`px-4 py-2 rounded-md ${activeTab === "credentials" ? "text-red-400 font-bold" : "text-gray-700"
              }`}
            onClick={() => setActiveTab("credentials")}
          >
            Credentials
          </button>
        </div>
        {/* Profile Section */}
        <div className="text-gray-700 font-semibold">
          <button
            className={`px-4 py-2 rounded-md ${activeTab === "profile" ? "text-red-400 font-bold" : "text-gray-700"
              }`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <div className="p-6">
        {activeTab === "images" && <ImagesTable images={images} />}
        {activeTab === "credentials" && <Credentials />}
        {activeTab === "profile" && <Profile />}
      </div>
    </div>
  );
}

function ImagesTable({ images }: { images: { id: number; name: string; uploaded_by: string; uploaded_at: string }[] }) {
  const API_URL = import.meta.env.VITE_SERVER_URL;
  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/images/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `${token}`,
        },
      });
      if (response.ok) {
        window.location.reload();
      } else {
        console.error("Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Images</h2>
      <div className="overflow-hidden rounded-xl shadow-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-red-200 text-gray-900 text-lg font-semibold">
              <th className="p-4 first:rounded-tl-xl last:rounded-tr-xl">ID</th>
              <th className="p-4">Name</th>
              <th className="p-4">Uploaded By</th>
              <th className="p-4">Uploaded At</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {images.map((image, index) => (
              <tr key={image.id} className={`text-center text-gray-700 text-md ${index % 2 === 0 ? "bg-white" : "bg-gray-100"} hover:bg-gray-200 transition`}>
                <td className="p-4">{image.id}</td>
                <td className="p-4">{image.name}</td>
                <td className="p-4">{image.uploaded_by}</td>
                <td className="p-4">{new Date(image.uploaded_at).toLocaleString()}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleDelete(image.id)}
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

      {/* Push Docker Image Row */}
      <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg mx-auto">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">🚀 Push Docker Image</h2>

        <form
          onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formElement = e.currentTarget as HTMLFormElement;
            const fileInput = formElement.elements.namedItem("file") as HTMLInputElement;

            if (!fileInput.files?.length) {
              console.error("No file selected");
              return;
            }

            const formData = new FormData();
            formData.append("file", fileInput.files[0]);

            try {
              const token = localStorage.getItem("token");
              const response = await fetch(API_URL+"/upload", {
                method: "POST",
                headers: {
                  Authorization: `${token}`,
                },
                body: formData,
              });
              const data = await response.json();
              if (response.ok) {
                alert("✅ Image uploaded successfully!");
                window.location.reload();
              } else {
                console.error(data.error || "Failed to upload image");
              }
            } catch (error) {
              console.error("Error uploading image:", error);
            }
          }}
          className="flex flex-col items-center space-y-4"
        >
          <input
            type="file"
            name="file"
            accept=".tar"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <button
            type="submit"
            className="w-wrap bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow-md hover:from-blue-600 hover:to-blue-800 transition duration-300"
          >
            🚢 Push Image
          </button>
        </form>
      </div>
    </div>
  );
}


