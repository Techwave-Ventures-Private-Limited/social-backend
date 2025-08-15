const express = require('express');
const app = express();
const admin = require('firebase-admin');

const cookieParser = require("cookie-parser");
const database = require('./config/dbonfig');
const cors = require("cors")
const fileUpload = require("express-fileupload")
const authRouter = require("./route/authRoute");
const userRouter = require("./route/userRoute");
const postRouter = require("./route/postRoute");
const eventRouter = require("./route/eventRoute");
const showcaseRouter = require("./route/showcaseRoute");
const newsRouter = require("./route/newsRoute");
const searchRouter = require("./route/searchRoute");
const notificationRouter = require("./route/notificationRoute");

const {cloudinaryConnect} = require("./config/cloudinary");
const serviceAccount = require("/etc/secrets/connektx-firebase-adminsdk-fbsvc-b76858ef61.json");

database.connect();
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const PORT = process.env.PORT;
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin:"*",
 		credentials:true,
    })
)

app.use(
	fileUpload({
		useTempFiles: true,
		tempFileDir: "/tmp/",
	})
);

cloudinaryConnect();

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/post", postRouter);
app.use("/event", eventRouter);
app.use("/showcase", showcaseRouter);
app.use("/news", newsRouter);
app.use("/search", searchRouter);
app.use("/notification", notificationRouter);
app.use("/hailing",(req,res)=>{
    return res.status(200).json({
        success:true,
        message:"hailing route",
    })
})

app.get("/",()=>{
    return `<h1>Working..</h1>`
})

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at ${PORT}`);
});

const axios = require('axios');

function callSelfApi() {
    axios.get('https://backend-new-u9tc.onrender.com/hailing')
        .then(response => {
            console.log('API Response:', response.data);
        })
        .catch(error => {
            console.error('Error calling API:', error.message);
        });
}

function scheduleApiCall() {
    callSelfApi(); 
    setInterval(callSelfApi, 14 * 60 * 1000);
}

scheduleApiCall();
