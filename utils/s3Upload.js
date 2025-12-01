const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const uploadResumeToS3 = async (file, userId) => {
    // Create a unique file name: resumes/userId_timestamp_filename
    const fileName = `resumes/${userId}_${Date.now()}_${file.originalname}`;

    const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL: 'public-read' // Uncomment if you want the file to be publicly accessible (Not recommended for resumes)
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Return the file location
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
};

module.exports = { uploadResumeToS3 };