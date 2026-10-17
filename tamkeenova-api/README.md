<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

Use Node.js 24 (pinned in `package.json` and `.nvmrc`) locally and on Vercel:

```bash
$ nvm use
$ npm ci
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Vercel deployment

- Use Vercel's **NestJS** framework preset with the repository root as the Root Directory. The entrypoint is `src/main.ts`; no custom serverless handler is required.
- `package.json` pins **Node.js 24.x** for both builds and Functions.
- `vercel.json` sets the non-secret runtime variable **`NODE_OPTIONS=--experimental-require-module`**. Keep any project-level `NODE_OPTIONS` override consistent with this flag; do not disable it with `--no-experimental-require-module`. This setting is required at process startup, not inside application code or a runtime-loaded `.env` file.
- Keep the build command as `npm run build` so Prisma Client is regenerated on every build. Do not configure `dist` as a static-site Output Directory.
- Set environment variables in the relevant Vercel environment (**Production** and/or **Preview**): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY`. Email delivery also requires `MAIL_USER` and `MAIL_PASSWORD`.
- For a different frontend domain or a preview frontend, add its exact origin to the comma-separated `FRONTEND_ORIGINS` variable.
- Leave **Automatically expose System Environment Variables** enabled. Vercel supplies `VERCEL=1`, which selects console logging instead of filesystem logging. Auth/security logs go to stdout and errors to stderr, as JSON with a `category` field. View them in **Vercel → Logs**. Locally, the existing `logs/auth`, `logs/errors`, and `logs/security` files are preserved.
- Redeploy after changing environment variables. Never commit `.env` or secret values.

After deployment, request **`/api/health`** (not `/health`):

```json
{ "success": true, "status": "ok" }
```

`/api` also returns the API's version and running message. A successful build alone does not prove runtime database connectivity; verify the health response and runtime logs on the deployed URL.

### Why `ERR_REQUIRE_ESM` occurred

The current NodeNext build emits CommonJS because this package does not declare `"type": "module"`. Nest 12 is ESM-only, and `@nestjs/throttler` also loads Nest through CommonJS. Local recent Node versions support `require(ESM)`, but [Vercel disables this feature by default](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-node.js-require-of-es-module). The runtime `NODE_OPTIONS` flag explicitly enables the documented interoperability support. Upgrading Node **alone** or changing only `main.ts` to a dynamic import would not address all of these imports.

Native runtime regression checks (after building, using Node 24):

```bash
npm run build
npm run test:runtime
```

These tests reproduce `ERR_REQUIRE_ESM` with interoperability disabled, check that the deployed flag loads Nest and Throttler, and run the **compiled `dist/main.js`** bootstrap with a read-only filesystem simulation. The bootstrap test substitutes database/storage/configuration providers and an ephemeral test listener; it is not a live database or Vercel connectivity test.

Logging regression checks (including a simulated read-only filesystem):

```bash
npm run test:logger
npm run test:certificates
npm test -- --runInBand --runTestsByPath src/modules/students/students.repository.spec.ts
```

The dedicated logger and certificate commands use the existing ESM-compatible test setup for Nest 12. The legacy default Jest configuration is not ESM-compatible for those suites.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).


## Recorded course workflow

Instructor authoring/publication approval, administrator-configured Vodafone Cash/InstaPay
manual checkout, verified payment activation, learner progress, instructor-confirmed
completion and automatic bilingual certificates are documented in
[prisma/course-workflow/README.md](prisma/course-workflow/README.md).

Apply the reviewed additive schema with `npm run db:course-workflow` before deploying
the updated API. Checkout stays disabled until an administrator configures real accounts.

### Admin-managed course categories and learner-role boundaries

`/admin/course-categories` is restricted to the **current database role** ADMIN/SUPER_ADMIN:
GET lists all records including hidden categories and reference counts; POST creates; PUT
`/:id` updates bilingual names/descriptions, slug, image URL, parent, display order and visibility;
PATCH `/:id/visibility` changes only visibility; DELETE `/:id` permanently removes only empty
categories. A referenced category returns 409: hide it or move course/program/child references
first. Serializable transactions, relation predicates and foreign keys protect concurrent writes.
Parents must be top-level categories; self-parenting/deep nesting are rejected. Slug conflicts
and invalid values use the existing inline `field_errors` contract.

POST `/admin/course-categories/image` accepts one `image` multipart field, up to 5MB. The
existing Supabase `tamkeenova` storage bucket/configuration is reused under `course-categories/`;
only magic-byte-checked JPG/PNG/WEBP are accepted, never SVG. No new public write endpoint,
client-provided storage credentials or database reset is required. Image URLs may instead be
HTTPS or a local `/path`. Uploading saves the file immediately; replacing a category image does
not delete old storage objects automatically. Existing category fields are sufficient: **no new
Prisma schema/DDL change** for this feature. Deploy the matching frontend and backend together.

Public category lists/filters suppress hidden categories and children of hidden roots. Hidden
category links are omitted from public course metadata. Hiding is navigation/organization, not
course unpublication: course content, purchase history and enrollments are preserved.

ADMIN/SUPER_ADMIN (like TRAINER) cannot enter the learner workflow: checkout, transfer reports,
free enrollment, library, progress and completion endpoints return 403 before invoking the
service. They retain the separate administration/review routes. STUDENT/CLIENT/EMPLOYEE/
VOLUNTEER learner roles remain supported. Older enrollments are not deleted.

`npm run test:course-workflow` includes category HTTP/DTO/upload/role and transactional service
regressions. Browser fixtures are explicit mocks; passing them does not establish a live DB or
Supabase upload/deployment.
