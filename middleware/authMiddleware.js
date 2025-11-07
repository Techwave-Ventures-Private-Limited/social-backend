const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.auth = async (req,res,next)=>{

    try{
        //console.log("Flow til here")
        const token = req.headers.token || req.headers.authorization.split(' ')[1];
        //console.log(process.env.JWT_SECRET)
        //console.log("Token:", token);
        if(!token){
            return res.status(401).json({
                success:false,
                message:"Token is  missing",
            })
        }

        try{
            const  decode = jwt.verify(token,process.env.JWT_SECRET);
            //console.log(decode)
            req.userId = decode.id;
        }
        catch(err){
            return res.status(401).json({
                success:false,
                message:"Tokine is  invalid"
            })
        }
        
        next();
    }
    catch(err){
        return res.status(500).json({
            success:false,
            message:err.message,
        })
    }

}

