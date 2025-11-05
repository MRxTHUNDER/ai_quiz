import dotenv from "dotenv";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT_URL,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const getPresignUploadUrl = async (
  fileName: string,
  contentType: string
) => {
  const sanitizedFileName = fileName.replace(/\s+/g, "_");
  const key = `uploads/pdf/${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || "",
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 180 });

  return { url, key };
};
