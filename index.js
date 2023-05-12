require("dotenv").config();
const cors = require("cors");
const express = require("express");
const app = express();
const Razorpay = require("razorpay");

const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const Product = require("./Models/productModels");
const Message = require("./Models/messageModel");

//middlewares
app.use(express.json());
app.use(cors());

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

//api endpoints

app.get("/", (req, res) => {
  res.status(200).send("Home");
});

app.get("/products", async (req, res) => {
  const products = await Product.find({});
  res.status(200).send(products);
});

app.post("/messages", async (req, res) => {
  const { name, email, description } = req.body;
  const message = await Message.create({ name, email, description });
  console.log(message);
  res.status(200).send(message);
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
    res.status(200).send({ success: true, key: process.env.RAZOR_KEY, data: order });
  } catch (error) {
    console.log(error);
  }
});

app.post("/payment", async (req, res) => {
  res.status(200).send({ success: true });
});
