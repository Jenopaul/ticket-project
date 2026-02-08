require("dotenv").config({ quiet: true });
console.log(`server running in ${process.env.PORT}`)
let express = require('express')
const cors = require("cors");
const connectDB = require("./database/db");
const authRoute = require("./routes/auth");
const usersRoute = require("./routes/users");
const ticketRoute = require("./routes/ticket");


let app = express()
connectDB()

app.use(cors());
app.use(express.json());


app.use("/auth", authRoute);
app.use("/users", usersRoute)
app.use("/ticket", ticketRoute)


module.exports = app