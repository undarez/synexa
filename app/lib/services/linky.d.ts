declare module '@bokub/linky' {
  export interface LinkyOptions {
    username: string;
    password: string;
    pce?: string;
  }

  export interface LinkyConsumptionData {
    date?: string;
    day?: string;
    timestamp?: string | number;
    value?: number;
    consumption?: number;
    unit?: string;
  }

  export interface LinkyConsumptionOptions {
    start: Date;
    end: Date;
    pdl?: string;
  }

  export class Linky {
    constructor(tokenOrOptions: string | LinkyOptions);
    login(): Promise<void>;
    getDailyConsumption(options: LinkyConsumptionOptions): Promise<LinkyConsumptionData[]>;
    getMonthlyConsumption(options: LinkyConsumptionOptions): Promise<LinkyConsumptionData[]>;
    logout(): Promise<void>;
  }
}

