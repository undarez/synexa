declare module 'bonjour' {
  interface Service {
    name: string;
    type: string;
    port: number;
    host?: string;
    protocol?: string;
    subtypes?: string[];
    txt?: Record<string, string>;
  }

  interface Browser extends NodeJS.EventEmitter {
    start(): void;
    stop(): void;
    update(): void;
    services: Service[];
  }

  interface BonjourInstance {
    (opts?: any): BonjourInstance;
    publish(opts: Service): Service;
    unpublishAll(callback?: () => void): void;
    find(opts: any, onUp?: (service: Service) => void): Browser;
    findOne(opts: any, timeout?: number, callback?: (service: Service) => void): Browser;
    destroy(): void;
  }

  const bonjour: BonjourInstance;
  export = bonjour;
}






