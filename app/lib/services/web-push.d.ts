declare module "web-push" {
  export interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export interface VapidDetails {
    subject: string;
    publicKey: string;
    privateKey: string;
  }

  export interface SendResult {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }

  export interface WebPush {
    setVapidDetails(
      subject: string,
      publicKey: string,
      privateKey: string
    ): void;
    
    sendNotification(
      subscription: PushSubscription,
      payload: string | Buffer,
      options?: {
        TTL?: number;
        headers?: Record<string, string>;
        contentEncoding?: "aes128gcm" | "aesgcm";
        urgency?: "very-low" | "low" | "normal" | "high";
        topic?: string;
      }
    ): Promise<SendResult>;

    generateVAPIDKeys(): {
      publicKey: string;
      privateKey: string;
    };
  }

  const webpush: WebPush;
  export default webpush;
}

