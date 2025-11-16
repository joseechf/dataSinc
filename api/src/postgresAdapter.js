import express from "express";
import ruter from "./ruter.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use(ruter);

const port = process.env.SERVER_PORT || 3000;

app.listen(port,()=>{
    console.log("server listening in ",port);
});