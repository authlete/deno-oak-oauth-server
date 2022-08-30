// Copyright (C) 2022 Authlete, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


import { AuthleteApiFactory } from 'https://deno.land/x/authlete_deno@v1.2.9/mod.ts';
import { Application, Router } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { Session } from 'https://deno.land/x/oak_sessions@v3.2.5/mod.ts';
import { adapterFactory, engineFactory, viewEngine } from 'https://deno.land/x/view_engine@v1.5.0/mod.ts';
import { AuthorizationDecisionEndpoint } from './endpoint/authorization_decision_endpoint.ts';
import { AuthorizationEndpoint } from './endpoint/authorization_endpoint.ts';
import { ConfigurationEndpoint } from './endpoint/configuration_endpoint.ts';
import { IntrospectionEndpoint } from './endpoint/introspection_endpoint.ts';
import { JwksEndpoint } from './endpoint/jwks_endpoint.ts';
import { RevocationEndpoint } from './endpoint/revocation_endpoint.ts';
import { TokenEndpoint } from './endpoint/token_endpoint.ts';


function setupSession(app: Application): void
{
    app.use( new Session().initMiddleware() );
}


function setupViewEngine(app: Application): void
{
    app.use( viewEngine(adapterFactory.getOakAdapter(), engineFactory.getEjsEngine()) );
}


async function setupRouter(app: Application): Promise<void>
{
    // Get an Authlete API instance.
    const api = await AuthleteApiFactory.getDefault();

    // Endpoints.
    const authorizationEndpoint         = new AuthorizationEndpoint(api);
    const authorizationDecisionEndpoint = new AuthorizationDecisionEndpoint(api);
    const tokenEndpoint                 = new TokenEndpoint(api);
    const revocationEndpoint            = new RevocationEndpoint(api);
    const introspectionEndpoint         = new IntrospectionEndpoint(api);
    const configurationEndpoint         = new ConfigurationEndpoint(api);
    const jwksEndpoint                  = new JwksEndpoint(api);

    // Router.
    const router = new Router();

    // Set up the router.
    router
      .get('/api/authorization',                async(ctx) => { await authorizationEndpoint.handleGet(ctx); })
      .post('/api/authorization',               async(ctx) => { await authorizationEndpoint.handlePost(ctx); })
      .post('/api/authorization/decision',      async(ctx) => { await authorizationDecisionEndpoint.handlePost(ctx); })
      .post('/api/token',                       async(ctx) => { await tokenEndpoint.handlePost(ctx); })
      .post('/api/revocation',                  async(ctx) => { await revocationEndpoint.handlePost(ctx); })
      .post('/api/introspection',               async(ctx) => { await introspectionEndpoint.handlePost(ctx); })
      .get('/api/jwks',                         async(ctx) => { await jwksEndpoint.handleGet(ctx); })
      .get('/.well-known/openid-configuration', async(ctx) => { await configurationEndpoint.handleGet(ctx); })
    ;

    // Set up the application to use the router.
    app.use(router.routes());
    app.use(router.allowedMethods());
}


async function setup(app: Application): Promise<void>
{
    // Set up session mechanism.
    setupSession(app);

    // Set up view engine.
    setupViewEngine(app);

    // Set up routes.
    await setupRouter(app);
}


async function main(): Promise<void>
{
    // Create an application.
    const app = new Application();

    // Set up the application.
    await setup(app);

    // Start the application.
    await app.listen({ port: 1902 });
}


await main();