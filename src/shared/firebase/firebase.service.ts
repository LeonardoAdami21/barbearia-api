import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';

/** Caminho padrão do JSON da service account (Console do Firebase > Configurações > Contas de serviço). */
const DEFAULT_CREDENTIALS_PATH = 'credentials/firebase-service-account.json';

/**
 * Firebase Admin inicializado com o JSON da service account.
 * Sem o arquivo a API sobe normalmente, só o login pelo Firebase fica indisponível (503).
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app?: App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const credentialsPath = resolve(
      this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH') ||
        DEFAULT_CREDENTIALS_PATH,
    );
    if (!existsSync(credentialsPath)) {
      this.logger.warn(
        `Service account do Firebase não encontrada em ${credentialsPath}: login pelo Firebase desativado.`,
      );
      return;
    }
    // Passa o JSON já lido (e não o caminho): o caminho usa uma opção obsoleta do google-auth-library.
    const serviceAccount = JSON.parse(
      readFileSync(credentialsPath, 'utf8'),
    ) as { project_id: string; client_email: string; private_key: string };
    this.app =
      getApps()[0] ??
      initializeApp({
        projectId: serviceAccount.project_id,
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
      });
    this.logger.log(
      `Firebase inicializado (projeto ${serviceAccount.project_id})`,
    );
  }

  get auth(): Auth {
    if (!this.app) {
      throw new ServiceUnavailableException(
        'Login pelo Firebase não está configurado no servidor.',
      );
    }
    return getAuth(this.app);
  }
}
