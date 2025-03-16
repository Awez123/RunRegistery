require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const multer = require("multer");
const Minio = require("minio");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 5000;

// PostgreSQL connection
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

// MinIO client setup
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_HOST,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const BUCKET_NAME = "docker-images";

// Ensure the MinIO bucket exists
async function createBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME);
      console.log(`Bucket '${BUCKET_NAME}' created.`);
    }
  } catch (error) {
    console.error("Error creating MinIO bucket:", error);
  }
}
createBucket();

// JWT Secret
const JWT_SECRET = "your_jwt_secret";

// Authentication Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// // User Registration
// app.post("/auth/register", async (req, res) => {
//   const { username, email, password } = req.body;
//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const result = await pool.query(
//       "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
//       [username, email, hashedPassword]
//     );
//     res.json({ message: "User registered successfully", user: result.rows[0] });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// User Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) return res.status(400).json({ error: "Invalid email or password" });

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign({ id: user.rows[0].id, email: user.rows[0].email }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Multer setup for handling Docker image uploads
const upload = multer({ dest: "uploads/" });

// Upload Docker Image
app.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { file } = req;
    const { originalname, path } = file;
    const objectName = `docker-${Date.now()}-${originalname}`;

    // Upload to MinIO
    await minioClient.fPutObject(BUCKET_NAME, objectName, path);
    fs.unlinkSync(path); // Delete local temp file after upload

    // Determine the uploaded_by value (email instead of ID)
    let uploadedBy = req.user && req.user.email ? req.user.email : "automation"; // Use email if available, otherwise "automation"

    // Store metadata in PostgreSQL
    const result = await pool.query(
      "INSERT INTO images (name, url, uploaded_by) VALUES ($1, $2, $3) RETURNING *",
      [originalname, `http://${process.env.MINIO_HOST}:${process.env.MINIO_PORT}/${BUCKET_NAME}/${objectName}`, uploadedBy]
    );

    res.json({ message: "Image uploaded successfully", image: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Image upload failed" });
  }
});
app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const { id } = req.user; // Extract id from JWT token

    // Fetch user details from the database
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Profile retrieved successfully", profile: result.rows[0] });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});




// Get All Images
app.get("/images", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM images ORDER BY uploaded_at DESC");
    res.json({ images: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve images" });
  }
});
// Delete Image by ID
app.delete("/images/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if image exists
    const imageResult = await pool.query("SELECT * FROM images WHERE id = $1", [id]);
    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    const image = imageResult.rows[0];
    const imageUrl = image.url;
    const objectName = imageUrl.split("/").pop(); // Extract object name from URL

    // Delete from MinIO
    await minioClient.removeObject(BUCKET_NAME, objectName);

    // Delete from PostgreSQL
    await pool.query("DELETE FROM images WHERE id = $1", [id]);

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Get Image Details
app.get("/images/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM images WHERE id = $1", [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Image not found" });

    res.json({ image: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve image details" });
  }
});

const { v4: uuidv4 } = require("uuid"); // Import UUID generator

app.post("/generate-token", authMiddleware, async (req, res) => {
  try {
    const email = req.user.email; // Get user email
    const expiresIn = "10y"; // Token valid for 10 years
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 10);

    const generatedToken = jwt.sign({ role: "automation" }, JWT_SECRET, { expiresIn });
    const tokenId = uuidv4(); // Generate a unique token ID

    // Store the token in PostgreSQL
    const result = await pool.query(
      "INSERT INTO tokens (token_id, token, created_by, expires_at) VALUES ($1, $2, $3, $4) RETURNING *",
      [tokenId, generatedToken, email, expirationDate]
    );

    res.json({ message: "Token generated and stored successfully", token: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate and store token" });
  }
});

app.delete("/delete-token/:token_id", authMiddleware, async (req, res) => {
  try {
    const { token_id } = req.params;

    // Delete token from PostgreSQL using token_id
    const result = await pool.query("DELETE FROM tokens WHERE token_id = $1 RETURNING *", [token_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Token not found" });
    }

    res.json({ message: "Token deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete token" });
  }
});

app.get("/get-all-tokens", authMiddleware, async (req, res) => {
  try {
    // Fetch all tokens from the database
    const result = await pool.query("SELECT token_id, token, created_by, expires_at FROM tokens");

    res.json({ message: "All tokens retrieved successfully", tokens: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});




app.delete("/delete-all-images", authMiddleware, async (req, res) => {
  try {
    // Fetch all images from the database
    const result = await pool.query("SELECT url FROM images");

    if (result.rows.length === 0) {
      return res.json({ message: "No images found to delete." });
    }

    // Extract object names from URLs
    const imagesToDelete = result.rows.map(row => {
      const urlParts = row.url.split("/");
      return urlParts[urlParts.length - 1]; // Extract the object name
    });

    // Delete images from MinIO
    for (const objectName of imagesToDelete) {
      await minioClient.removeObject(BUCKET_NAME, objectName);
    }

    // Delete records from PostgreSQL
    await pool.query("DELETE FROM images");

    res.json({ message: "All images deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete images" });
  }
});

app.get("/health", (req, res) => {
  res.send("Server is running!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});

// Start Server

