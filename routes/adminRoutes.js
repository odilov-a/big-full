const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Blog = require("../models/Blog");
const Product = require("../models/Product");
const uuid = require("uuid");
const Admin = require("../models/Admin");

const authenticateUser = async (username, password) => {
  try {
    const adminUser = await Admin.findOne({ username });
    if (adminUser && adminUser.password === password) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error authenticating admin user:", error);
    return false;
  }
};

const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  return res.redirect("/");
};

router.post("/", async (req, res) => {
  const { username, password } = req.body;
  try {
    if (await authenticateUser(username, password)) {
      req.session.isAuthenticated = true;
      return res.redirect("/dashboard");
    } else {
      return res.render("login", {
        error: "Yaroqsiz foydalanuvchi nomi yoki parol",
      });
    }
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).render("error", { error: "Internal Server Error" });
  }
});

router.get("/", (req, res) => {
  return res.render("login", { error: null });
});

router.get("/logout", isAuthenticated, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    return res.redirect("/");
  });
});

router.get("/dashboard", isAuthenticated, (req, res) => {
  return res.render("adminDashboard");
});

// blogs route codes
router.get("/blogs", isAuthenticated, async (req, res) => {
  try {
    const blogs = await Blog.find();
    return res.render("adminBlogs", { blogs });
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${uuid.v4()}-${file.originalname}`;
    cb(null, uniqueFilename);
  },
});
const upload = multer({ storage: storage });

router.post(
  "/blogs/create",
  upload.single("newPhoto"),
  isAuthenticated,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file attached to the request");
      }
      const photoPath = req.file.path;
      const { newTitle, newDescription } = req.body;
      if (!newTitle || !newDescription) {
        return res.status(400).send("All inputs are required");
      }
      const newBlog = new Blog({
        title: newTitle,
        description: newDescription,
        photo: photoPath,
      });
      await newBlog.save();
      return res.redirect("/blogs");
    } catch (error) {
      return res
        .status(500)
        .render("error", { error: "Internal Server Error" });
    }
  }
);

router.post(
  "/blogs/update/:blogId",
  isAuthenticated,
  upload.single("updatedPhoto"),
  async (req, res) => {
    try {
      const blogId = req.params.blogId;
      const { updatedTitle, updatedDescription } = req.body;
      const updatedPhoto = req.file ? req.file.path : "";
      const blog = await Blog.findById(blogId);
      if (!blog) {
        return res.status(404).send("Blog not found");
      }
      blog.title = updatedTitle;
      blog.description = updatedDescription;
      if (updatedPhoto) {
        blog.photo = updatedPhoto;
      }
      await blog.save();
      return res.redirect("/blogs");
    } catch (error) {
      return res
        .status(500)
        .render("error", { error: "Internal Server Error" });
    }
  }
);

router.get("/blogs/delete/:blogId", isAuthenticated, async (req, res) => {
  try {
    const blogId = req.params.blogId;
    const deletedBlog = await Blog.findByIdAndDelete(blogId);
    if (!deletedBlog) {
      return res.status(404).send("Blog not found");
    }
    return res.redirect("/blogs");
  } catch (error) {
    return res.status(500).send("Internal Server Error: " + error.message);
  }
});

// products route codes
router.get("/products", isAuthenticated, async (req, res) => {
  try {
    const products = await Product.find();
    res.render("adminProducts", { products });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", { error: "Internal Server Error" });
  }
});

router.get("/products/:productId", isAuthenticated, async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json(product);
  } catch (error) {
    console.error("Error fetching product details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/products/create", isAuthenticated, async (req, res) => {
  try {
    const { newName, newCategory, newPrice, newQalinligi } = req.body;
    const newProduct = new Product({
      name: newName,
      category: newCategory,
      price: newPrice,
      qalinligi: newQalinligi,
    });
    await newProduct.save();
    return res.redirect("/products");
  } catch (error) {
    return res.status(500).json({ error });
  }
});

router.post(
  "/products/update/:productId",
  isAuthenticated,
  async (req, res) => {
    try {
      const productId = req.params.productId;
      const { updatedName, updatedCategory, updatedQalinligi, updatedPrice } =
        req.body;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).send("Product not found");
      }
      product.name = updatedName;
      product.category = updatedCategory;
      product.qalinligi = updatedQalinligi;
      product.price = updatedPrice;
      await product.save();
      return res.redirect("/products");
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .render("error", { error: "Internal Server Error" });
    }
  }
);

router.get("/products/delete/:productId", isAuthenticated, async (req, res) => {
  try {
    const productId = req.params.productId;
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.status(404).send("Product not found");
    }
    return res.redirect("/products");
  } catch (error) {
    return res.status(500).render("error", { error: "Internal Server Error" });
  }
});

router.get("/users", isAuthenticated, async (req, res) => {
  try {
    const users = await Admin.find();
    return res.render("adminUsers", { users });
  } catch (error) {
    console.error(error);
    return res.status(500).render("error", { error: "Internal Server Error" });
  }
});

router.get("/users/:userId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }
    return res.json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/update/:userId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { updatedUsername, updatedPassword } = req.body;
    if (!updatedUsername || !updatedPassword) {
      return res.status(400).send("All fields are required");
    }
    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).send("Admin not found");
    }
    user.username = updatedUsername;
    user.password = updatedPassword;
    await user.save();
    req.session.username = updatedUsername;
    return res.redirect("/logout");
  } catch (error) {
    console.error(error);
    return res.status(500).render("error", { error: "Internal Server Error" });
  }
});


module.exports = router;
