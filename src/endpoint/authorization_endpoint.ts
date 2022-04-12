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


import {
    AuthleteApi, AuthorizationPageModel, AuthorizationRequest, AuthorizationResponse,
    isEmpty, Prompt
} from 'https://deno.land/x/authlete_deno@v1.2.6/mod.ts';
import {
    AuthorizationDecisionHandler, AuthorizationRequestErrorHandler,
    getFormParametersAsString, getQueryParametersAsString,
    internalServerErrorOnApiCallFailure, NoInteractionHandler, okHtml
} from 'https://deno.land/x/authlete_deno_oak@v1.0.1/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import Session from 'https://deno.land/x/oak_sessions@v3.2.5/src/Session.ts';
import { NoInteractionHandlerSpiImpl } from '../impl/no_interaction_handler_spi_impl.ts';
import { BaseEndpoint } from './base_endpoint.ts';
import Action = AuthorizationResponse.Action;
import Params = AuthorizationDecisionHandler.Params;


/**
 * The path to the authorization page.
 */
const AUTHORIZATION_PAGE = './rsc/ejs/authorization.ejs';


async function handle(api: AuthleteApi, ctx: Context, parameters: string): Promise<void>
{
    // Call Authlete '/auth/authorization' API.
    const response = await callAuthorization(api, ctx, parameters);

    if (!response)
    {
        // If a response is not obtained, it means calling Authlete
        // '/auth/authorization' API failed.
        return;
    }

    // Dispatch according to the action.
    switch (response.action)
    {
        case Action.INTERACTION:
            // Process the authorization request with user interaction.
            await handleInteraction(ctx, response);
            break;

        case Action.NO_INTERACTION:
            // Process the authorization request without user interaction.
            // The flow reaches here only when the authorization request
            // contained prompt=none.
            await handleNoInteraction(api, ctx, response);
            break;

        default:
            // Handle other error cases here.
            await handleError(api, ctx, response);
            break;
    }
}


async function callAuthorization(api: AuthleteApi, ctx: Context, parameters: string):
    Promise<AuthorizationResponse | void>
{
    try
    {
        // Call Authlete '/auth/authorization' API.
        return await api.authorization(createAuthorizationRequest(parameters))
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


function createAuthorizationRequest(parameters: string): AuthorizationRequest
{
    // Create a request for Authlete '/auth/authorization' API.
    const request = new AuthorizationRequest();

    // Set the 'parameters' parameter.
    request.parameters = parameters;

    return request;
}


async function handleInteraction(
    ctx: Context, info: AuthorizationResponse): Promise<void>
{
    // Current user session.
    const session = ctx.state.session;

    // Set parameters to the session for later use.
    await session.set('params', Params.from(info));
    await session.set('acrs',   info.acrs);
    await session.set('client', info.client);

    // Clear the current user info in the session if needed.
    await clearUserDataIfNecessary(info, session);

    // Get the user information.
    const user = await session.get('user');

    // Information for rendering an authorization page.
    const model = new AuthorizationPageModel(info, user);

    // Return a response of '200 OK' with the authorization page.
    okHtml(ctx, AUTHORIZATION_PAGE, { model: model });
}


async function handleNoInteraction(
    api: AuthleteApi, ctx: Context, response: AuthorizationResponse): Promise<void>
{
    // Current user session.
    const session = ctx.state.session;

    // Get the user info from the session.
    const user     = await session.get('user');
    const authTime = await session.get('authTime');

    // An implementation of NoInteractionHandlerSpi.
    const spi = new NoInteractionHandlerSpiImpl(user, authTime);

    // Handle the request.
    await new NoInteractionHandler(api, spi).handle(ctx, response);
}


async function handleError(
    api: AuthleteApi, ctx: Context, response: AuthorizationResponse): Promise<void>
{
    await new AuthorizationRequestErrorHandler(api).handle(ctx, response);
}


async function clearUserDataIfNecessary(
    info: AuthorizationResponse, session: Session): Promise<void>
{
    // Get the user info from the session.
    const user     = await session.get('user');
    const authTime = await session.get('authTime');

    if (user === null || authTime === null)
    {
        // No check is required if the user info does not exist in the
        // session.
        return;
    }

    // Check 'prompts'.
    await checkPrompts(info, session);

    // Check 'authentication age'.
    await checkAuthenticationAge(info, session, authTime as Date);
}


async function checkPrompts(info: AuthorizationResponse, session: Session): Promise<void>
{
    // If no prompt is requested.
    if (isEmpty(info.prompts))
    {
        // No check is required.
        return;
    }

    // If 'login' prompt is requested.
    if (info.prompts.includes(Prompt.LOGIN))
    {
        // Force a login by clearing out the current user info.
        await clearUserData(session);
    }
}


async function checkAuthenticationAge(
    info: AuthorizationResponse, session: Session, authTime: Date): Promise<void>
{
    // if the maximum authentication age is not a positive number.
    if (info.maxAge <= 0)
    {
        // No check is needed.
        return;
    }

    // Calculate number of seconds that have elapsed since login.
    const now = new Date();
    const authAge = Math.round( (now.getTime() - authTime.getTime()) / 1000 );

    // If session age is too old.
    if (authAge > info.maxAge)
    {
        // Clear out the current user data.
        await clearUserData(session);
    }
}


async function clearUserData(session: Session): Promise<void>
{
    await session.set('user', null);
    await session.set('authTime', null);
}


/**
 * An implementation of OAuth 2.0 authorization endpoint with OpenID
 * Connect support. For more details, see the following links.
 *
 * - [RFC 6749, 3.1. Authorization Endpoint](
 * http://tools.ietf.org/html/rfc6749#section-3.1)
 *
 * - [OpenID Connect Core 1.0, 3.1.2. Authorization Endpoint (Authorization
 * Code Flow)](http://openid.net/specs/openid-connect-core-1_0.html#AuthorizationEndpoint)
 *
 * - [OpenID Connect Core 1.0, 3.2.2. Authorization Endpoint (Implicit
 * Flow)](http://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthorizationEndpoint)
 *
 * - [OpenID Connect Core 1.0, 3.3.2. Authorization Endpoint (Hybrid
 * Flow)](http://openid.net/specs/openid-connect-core-1_0.html#HybridAuthorizationEndpoint)
 */
export class AuthorizationEndpoint extends BaseEndpoint
{
    /**
     * The authorization endpoint for `GET` method.
     *
     * [RFC6749 3.1 Authorization Endpoint](
     * http://tools.ietf.org/html/rfc6749#section-3.1) says that the
     * authorization endpoint MUST support `GET` method.
     */
    public async handleGet(ctx: Context): Promise<void>
    {
        await handle(this.api, ctx, getQueryParametersAsString(ctx));
    }


    /**
     * The authorization endpoint for `POST` method.
     *
     * [RFC6749 3.1 Authorization Endpoint](
     * http://tools.ietf.org/html/rfc6749#section-3.1) says that the
     * authorization endpoint MAY support `POST` method.
     *
     * In addition, [OpenID Connect Core 1.0, 3.1.2.1. Authentication
     * Request](http://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)}
     * says that the authorization endpoint MUST support `POST` method.
     */
    public async handlePost(ctx: Context): Promise<void>
    {
        await handle(this.api, ctx, await getFormParametersAsString(ctx));
    }
}