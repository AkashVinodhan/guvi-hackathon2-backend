require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const express = require("express");
const app = express();
const Razorpay = require("razorpay");

const mongoose = require("mongoose");
const Product = require("./Models/productModels");
const Message = require("./Models/messageModel");
const User = require("./Models/userModel");

//middlewares
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// connect to DB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
  } catch (error) {
    console.log(error);
  }
};
connectDB();

//listen on port only when DB is connected
mongoose.connection.once("open", () => {
  console.log("Connected to DB");
  app.listen(process.env.PORT, (req, res) => {
    console.log("Server running in port ", process.env.PORT);
  });
});

//util functions
const handleErrors = (err) => {
  if (err.code == 11000) {
    let message = Object.keys(err.keyValue)[0] + " is already taken";
    return message;
  } else {
    let message = "No errors";
    return message;
  }
};

const createToken = (id) => {
  return jwt.sign({ id }, "mySecret", { expiresIn: 60 * 60 }); // expiry in secs
};
//api endpoints

//get all products
app.get("/products", async (req, res) => {
  const products = await Product.find({});
  res.send(products);
});

//get product by id
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const product = await Product.findOne({ _id: id });
  res.send(product);
});

// PUT req to update product
app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, picture, category } = req.body;
  const updatedProduct = { name, price, picture, category };
  const product = await Product.findOneAndUpdate({ _id: id }, updatedProduct, {
    new: true,
  });
  res.send(product);
});

//store messages
app.post("/messages", async (req, res) => {
  const { name, email, description } = req.body;
  const message = await Message.create({ name, email, description });
  console.log(message);
  res.send(message);
});

//login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      //compare passwords if user exists in DB
      const auth = await bcrypt.compare(password, user.password);
      if (auth) {
        //* generate jwt
        const token = createToken(user._id);
        //* send jwt as a cookie
        res.cookie("jwt", token, { httpOnly: true, maxAge: 60 * 60 * 1000 }); //maxage in milli secs
        res.status(200).send({ message: "Logged in", user: user.username });
      } else {
        res.status(400).send("Password is Incorrect");
      }
    } else {
      res.status(400).send("Username is Incorrect");
    }
  } catch (error) {
    console.log(error);
  }
});
//signup
app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;

  //*hash password
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    const user = await User.create({
      username,
      password: hashedPassword,
      email,
    });

    //* generate jwt
    const token = createToken(user._id);
    //* send jwt as a cookie
    res.cookie("jwt", token, { httpOnly: true, maxAge: 60 * 60 * 1000 }); //maxage in milli secs
    res
      .status(200)
      .send({ message: "New Admin Created in DB", user: user.username });
  } catch (error) {
    let errorMessage = handleErrors(error);
    res.status(400).send(errorMessage);
  }
});
// logout
app.get("/logout", (req, res) => {
  console.log(req.cookies);
  res.clearCookie("jwt");
  res.send("Logout Successfull");
});
//create new product
app.post("/newProduct", async (req, res) => {
  const { name, price, picture, category } = req.body;
  const product = await Product.create({
    name,
    price,
    duration: "day",
    picture,
    category,
  });
  console.log(product);
  res.send("Product Created!");
});

const instance = new Razorpay({
  key_id: process.env.RAZOR_KEY,
  key_secret: process.env.RAZOR_KEY_SECRET,
});

app.post("/order", async (req, res) => {
  try {
    const { order_id, price, order_details } = req.body;

    const options = {
      amount: Number(price * 100),
      currency: "INR",
    };
    const order = await instance.orders.create(options);
    res.send({ success: true, key: process.env.RAZOR_KEY, data: order });
  } catch (error) {
    console.log(error);
  }
});

app.post("/payment", async (req, res) => {
  res.send({ success: true });
});
