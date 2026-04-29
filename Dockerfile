FROM node:24-bookworm-slim

WORKDIR /workspace

ENV PATH="/workspace/node_modules/.bin:${PATH}"

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock ./
COPY packages/be/package.json packages/be/package.json
COPY packages/fe/package.json packages/fe/package.json
COPY packages/next/package.json packages/next/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN yarn install --non-interactive --ignore-scripts

COPY packages/be/nest-cli.json packages/be/nest-cli.json
COPY packages/be/serverless.yml packages/be/serverless.yml
COPY packages/be/tsconfig.build.json packages/be/tsconfig.build.json
COPY packages/be/tsconfig.json packages/be/tsconfig.json
COPY packages/be/src packages/be/src
COPY packages/shared/tsconfig.build.json packages/shared/tsconfig.build.json
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY packages/shared/src packages/shared/src
