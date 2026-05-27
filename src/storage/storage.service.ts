import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly internalClient: S3Client;
  private readonly publicClient: S3Client;
  readonly bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT ?? 'http://minio:9000';
    const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? endpoint;
    const accessKeyId = process.env.S3_ACCESS_KEY ?? 'minioadmin';
    const secretAccessKey = process.env.S3_SECRET_KEY ?? 'minioadmin';

    this.bucket = process.env.S3_BUCKET ?? 'corretor-docs';

    const base = {
      region: 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    };
    this.internalClient = new S3Client({ ...base, endpoint });
    this.publicClient = new S3Client({ ...base, endpoint: publicEndpoint });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.internalClient.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket ${this.bucket} já existe.`);
    } catch {
      try {
        await this.internalClient.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`✅ Bucket ${this.bucket} criado.`);
      } catch (err) {
        this.logger.warn(
          `Não foi possível criar o bucket (provavelmente já existe): ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
  ): Promise<{ key: string; size: number }> {
    await this.internalClient.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key, size: body.byteLength };
  }

  async getPresignedDownloadUrl(key: string, ttlSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }
}
