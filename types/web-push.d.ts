declare module 'web-push' {
  interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  function generateVAPIDKeys(): VapidKeys;
  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;
  function sendNotification(
    subscription: PushSubscription,
    payload: string | Buffer,
    options?: any
  ): Promise<void>;

  const webpush: {
    generateVAPIDKeys: typeof generateVAPIDKeys;
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };

  export default webpush;
}

