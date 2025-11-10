const nodemailer = require("nodemailer");
require("dotenv").config();

const mailSender = async (email, title, body) => {
    try{
            const {
                MAIL_HOST,
                MAIL_PORT,
                MAIL_USER,
                MAIL_PASS,
                MAIL_SECURE
            } = process.env;

            if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) {
                throw new Error("Email transport is not configured. Set MAIL_HOST, MAIL_USER, and MAIL_PASS.");
            }

            const port = MAIL_PORT ? parseInt(MAIL_PORT, 10) : 587;
            const secure = MAIL_SECURE ? /^true|1$/i.test(MAIL_SECURE) : (port === 465);

            let transporter = nodemailer.createTransport({
                host: MAIL_HOST,
                port,
                secure,
                auth:{
                    user: MAIL_USER,
                    pass: MAIL_PASS,
                }
            })

            let info = await transporter.sendMail({
                from: `Connektx <${MAIL_USER}>`,
                to:`${email}`,
                subject: `${title}`,
                html: `${body}`,
            })
            //console.log("Info:" , info);
            return info;
    }
    catch(error) {
        console.log(error.message);
        throw error;
    }
}


module.exports = mailSender;