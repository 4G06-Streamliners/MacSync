import 'dotenv/config';
import { Readable } from 'stream';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cors from '@fastify/cors';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';

interface RequestWithUrlAndRawBody {
  url?: string;
  rawBody?: Buffer;
}

/** Comma-separated list in CORS_ORIGINS, e.g. https://admin.macsync.org,http://localhost:3001 */
function corsOriginOption(): boolean | string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    return true;
  }
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    return true;
  }
  return list;
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const fastifyInstance = app.getHttpAdapter().getInstance();

  // For Stripe webhook: capture raw body for signature verification (only on webhook route)
  fastifyInstance.addHook(
    'preParsing',
    (request: RequestWithUrlAndRawBody, _reply, payload, done) => {
      const isStripeWebhook =
        request.url != null && request.url.startsWith('/webhooks/stripe');
      if (!isStripeWebhook) {
        done(null, payload);
        return;
      }
      const chunks: Buffer[] = [];
      payload.on('data', (chunk: Buffer) => chunks.push(chunk));
      payload.on('end', () => {
        request.rawBody = Buffer.concat(chunks);
        done(null, Readable.from(request.rawBody));
      });
      payload.on('error', (err: Error) => done(err, undefined));
    },
  );

  // CORS: set CORS_ORIGINS on the VPS (e.g. https://admin.macsync.org). If unset, all origins are allowed (dev).
  await app.register(cors, {
    origin: corsOriginOption(),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    maxAge: 86_400,
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
