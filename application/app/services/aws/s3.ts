import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

function generateUniqueKey(fileName: string) {
  const uuid = uuidv4();
  const extension = fileName.split('.').pop() ?? '';
  const nameWithoutExtension = encodeURIComponent(
    fileName.slice(0, -(extension.length + 1)),
  );
  if (!extension) {
    return `${nameWithoutExtension}-${uuid}`;
  }
  return `${nameWithoutExtension}-${uuid}.${extension}`;
}

export async function uploadFile(file: File) {
  // returns image url of the uploaded file
  const bucketName = process.env.S3_BUCKET ?? '';
  const region = process.env.AWS_REGION ?? '';
  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
  });
  const uniqueKey = generateUniqueKey(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const params = {
    Bucket: bucketName,
    Key: uniqueKey,
    Body: buffer,
    ContentType: file.type,
  };
  const command = new PutObjectCommand(params);
  await client.send(command);
  const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueKey}`;
  return imageUrl;
}
