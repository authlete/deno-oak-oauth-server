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
    AuthorizationDecisionHandler, badRequest, getFormParameters
} from 'https://deno.land/x/authlete_deno_oak@v1.0.2/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { UserDao } from '../db/user_dao.ts';
import { AuthorizationDecisionHandlerSpiImpl } from '../impl/authorization_decision_handler_spi_impl.ts';
import { BaseEndpoint } from './base_endpoint.ts';


async function authenticateUserIfNecessary(
    session: any, formParams: URLSearchParams): Promise<void>
{
    if (await session.has('user'))
    {
        // OK. A user already exists in the session.
        return;
    }

    // Authenticate a user with the user credentials (ID and password)
    // contained in the request body.

    // Extract login credentials from the request.
    const loginId  = formParams.get('loginId');
    const password = formParams.get('password');

    // Look up an end-user who has the login credentials.
    const loginUser = UserDao.getByCredentials(loginId, password);

    // If the user was found.
    if (loginUser)
    {
        // Save the user info in the session.
        await session.set('user', loginUser);

        // Save the authentication time in the session.
        await session.set('authTime', new Date());
    }
}


async function takeAttribute(session: any, key: string): Promise<any | null>
{
    if ( !(await session.has(key)) )
    {
        // The key doesn't exist in the session.
        return null;
    }

    // Retrieve the value from the session.
    const value: any = await session.get(key);

    // Remove the attribute from the session.
    await session.set(key, null);

    // Return the value.
    return value;
}


/**
 * The endpoint that receives a request from the form in the authorization
 * page.
 */
export class AuthorizationDecisionEndpoint extends BaseEndpoint
{
    /**
     * Process a request from the form in the authorization page.
     *
     * Note that a better implementation would re-display the authorization
     * page when the pair of login ID and password is wrong, but this
     * implementation does not do it for brevity. A much better implementation
     * would check the login credentials by Ajax.
     */
    public async handlePost(ctx: Context): Promise<void>
    {
        // Get parameters in the request body.
        const formParams = await getFormParameters(ctx);

        // The existing session.
        const session = ctx.state.session;

        // The end-user who authorized or denied the client application's
        // request.
        await authenticateUserIfNecessary(session, formParams);

        // The parameters passed to the handler.
        const params = await takeAttribute(session, 'params');

        if (!params)
        {
            // The key must be present in the session but no such key
            // exists in the session.
            badRequest(ctx, "'params' must be present in the session.");
            return;
        }

        // Retrieve some variables from the form parameters and the session.
        const authorized = formParams.has('authorized');
        const user       = await session.get('user');
        const authTime   = await session.get('authTime');

        // An implementation of AuthorizationDecisionHandlerSpi.
        const spi = new AuthorizationDecisionHandlerSpiImpl(authorized, user, authTime);

        // Handle the request.
        await new AuthorizationDecisionHandler(this.api, spi).handle(ctx, params);
    }
}