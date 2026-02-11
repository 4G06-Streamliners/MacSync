import 'dotenv/config';
import { Readable } from 'stream';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const fastifyInstance = app.getHttpAdapter().getInstance();

  // For Stripe webhook: capture raw body for signature verification (only on webhook route)
  fastifyInstance.addHook('preParsing', (request: any, _reply, payload, done) => {
    const isStripeWebhook =
      request.url && request.url.startsWith('/webhooks/stripe');
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
  });

  // Enable CORS for all origins
  await app.register(require('@fastify/cors'), {
    origin: true, // Allow all origins
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
