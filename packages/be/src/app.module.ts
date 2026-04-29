import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import type { Request } from 'express';

import { AppController } from './app.controller';
import { ApiKeyGuard } from './common/auth/api-key.guard';
import { RequestObservabilityMiddleware } from './common/observability/request-observability.middleware';
import { LocationsModule } from './locations/locations.module';
import { WeatherModule } from './integrations/weather/weather.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: true,
      context: ({ req }: { req: Request }) => ({ req }),
      driver: ApolloDriver,
      sortSchema: true,
    }),
    WeatherModule,
    LocationsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestObservabilityMiddleware).forRoutes('*');
  }
}
