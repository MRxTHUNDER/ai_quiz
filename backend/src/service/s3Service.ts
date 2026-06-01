import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2_ACCESS_KEY_ID, R2_BUCKET_NAME, R2_ENDPOINT_URL, R2_SECRET_ACCESS_KEY } from "../env";

const s3Client = new S3Client({
  endpoint: R2_ENDPOINT_URL,
  region: "auto",
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export const getPresignUploadUrl = async (
  fileName: string,
  contentType: string,
  folderName: string = "pdf",
) => {
  const sanitizedFileName = fileName.replace(/\s+/g, "_");
  const key = `uploads/${folderName}/${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 180 });

  return { url, key };
};

export const uploadBufferToS3 = async (
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folderName: string = "docx",
) => {
  const sanitizedFileName = fileName.replace(/\s+/g, "_");
  const key = `uploads/${folderName}/${Date.now()}_${sanitizedFileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return { key };
};

export const getObjectBufferFromS3 = async (key: string): Promise<Buffer> => {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  );

  const body = response.Body;
  if (!body) {
    throw new Error(`Empty object body for key: ${key}`);
  }

  const bytes = await body.transformToByteArray();
  return Buffer.from(bytes);
};
