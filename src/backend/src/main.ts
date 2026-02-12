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

  // Enable CORS for all origins, including non-GET methods used by the admin panel
  await app.register(cors, {
    origin: true, // Allow all origins (dev)
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
