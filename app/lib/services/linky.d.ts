declare module '@bokub/linky' {
  export interface LinkyOptions {
    username: string;
    password: string;
    pce?: string;
  }

  export interface LinkyConsumptionData {
    date: string;
    value: number;
    unit?: string;
  }

  export class Linky {
    constructor(tokenOrOptions: string | LinkyOptions);
    login(): Promise<void>;
    getDailyConsumption(startDate: Date, endDate: Date): Promise<LinkyConsumptionData[]>;
    getMonthlyConsumption(startDate: Date, endDate: Date): Promise<LinkyConsumptionData[]>;
    logout(): Promise<void>;
  }
}

