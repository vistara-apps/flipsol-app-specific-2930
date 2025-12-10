import { Connection, PublicKey } from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RPCHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastChecked: Date;
  error?: string;
}

export interface VRFHealth {
  status: 'healthy' | 'degraded';
  lastBlockhash: string;
  blockhashAge: number;
  randomnessAvailable: boolean;
}

export class MonitoringService {
  private connection: Connection;
  private rpcHealth: RPCHealth = {
    status: 'down',
    latency: 0,
    lastChecked: new Date(),
  };
  private vrfHealth: VRFHealth = {
    status: 'healthy',
    lastBlockhash: '',
    blockhashAge: 0,
    randomnessAvailable: true,
  };

  constructor(connection: Connection) {
    this.connection = connection;
    this.startMonitoring();
  }

  private async checkRPCHealth(): Promise<RPCHealth> {
    const startTime = Date.now();
    try {
      const slot = await this.connection.getSlot();
      const latency = Date.now() - startTime;

      return {
        status: latency < 1000 ? 'healthy' : latency < 3000 ? 'degraded' : 'down',
        latency,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  private async checkVRFHealth(): Promise<VRFHealth> {
    try {
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      const slot = await this.connection.getSlot();
      const blockhashAge = slot - lastValidBlockHeight;

      return {
        status: blockhashAge < 150 ? 'healthy' : 'degraded',
        lastBlockhash: blockhash,
        blockhashAge,
        randomnessAvailable: blockhashAge < 150,
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        lastBlockhash: '',
        blockhashAge: Infinity,
        randomnessAvailable: false,
      };
    }
  }

  private async startMonitoring() {
    // Check RPC health every 30 seconds
    setInterval(async () => {
      this.rpcHealth = await this.checkRPCHealth();
      this.log('RPC Health', this.rpcHealth);
    }, 30000);

    // Check VRF health every 10 seconds
    setInterval(async () => {
      this.vrfHealth = await this.checkVRFHealth();
      this.log('VRF Health', this.vrfHealth);
    }, 10000);

    // Initial checks
    this.rpcHealth = await this.checkRPCHealth();
    this.vrfHealth = await this.checkVRFHealth();
  }

  public getRPCHealth(): RPCHealth {
    return this.rpcHealth;
  }

  public getVRFHealth(): VRFHealth {
    return this.vrfHealth;
  }

  public async getSystemHealth() {
    const [rpcHealth, vrfHealth, dbHealth] = await Promise.all([
      this.checkRPCHealth(),
      this.checkVRFHealth(),
      this.checkDatabaseHealth(),
    ]);

    return {
      rpc: rpcHealth,
      vrf: vrfHealth,
      database: dbHealth,
      overall: rpcHealth.status === 'healthy' && 
               vrfHealth.status === 'healthy' && 
               dbHealth.status === 'healthy' 
               ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabaseHealth() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy' as const,
        latency: 0,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      return {
        status: 'down' as const,
        latency: 0,
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  private log(service: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [MONITOR] ${service}:`, JSON.stringify(data));
  }
}
