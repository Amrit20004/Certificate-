import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Certificates are never served from a public bucket. Files are addressed by an
 * opaque key and streamed back through an authenticated route, so a leaked or
 * guessed URL gets you nothing.
 */
export interface StorageDriver {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

class LocalDriver implements StorageDriver {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    // Refuse anything that escapes the storage root.
    if (!full.startsWith(path.resolve(this.root) + path.sep)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async put(key: string, body: Uint8Array): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async get(key: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.resolve(key)));
  }
}

class S3Driver implements StorageDriver {
  private client: unknown;

  private async sdk() {
    // Imported lazily so the local driver works without the AWS packages installed.
    // @ts-ignore
    const mod = (await import("@aws-sdk/client-s3")) as any;
    this.client ??= new mod.S3Client({
      region: process.env.S3_REGION,
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    return { mod, client: this.client as any };
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    const { mod, client } = await this.sdk();
    await client.send(
      new mod.PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
        // No public ACL, deliberately.
      }),
    );
  }

  async get(key: string): Promise<Uint8Array> {
    const { mod, client } = await this.sdk();
    const result = await client.send(
      new mod.GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    );
    return new Uint8Array(await result.Body!.transformToByteArray());
  }
}

let driver: StorageDriver | undefined;

export function storage(): StorageDriver {
  if (!driver) {
    driver =
      process.env.STORAGE_DRIVER === "s3"
        ? new S3Driver()
        : new LocalDriver(process.env.LOCAL_STORAGE_DIR ?? "./storage");
  }
  return driver;
}

/** certificates/2026/NXT-INT-2026-000001.pdf */
export function certificatePdfKey(year: number, certificateNumber: string): string {
  return `certificates/${year}/${certificateNumber}.pdf`;
}
