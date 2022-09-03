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


import { AuthorizationRequestHandlerSpiAdapter } from 'https://deno.land/x/authlete_deno_oak@v1.0.3/mod.ts';
import { UserEntity } from '../db/user_entity.ts';


/**
 * Implementation of `AuthorizationDecisionHandlerSpi` interface.
 */
export class AuthorizationRequestHandlerSpiImpl extends AuthorizationRequestHandlerSpiAdapter
{
    private user?: UserEntity;
    private authTime?: Date;


    /**
     * The constructor.
     *
     * @param session
     *         The session associated with a request.
     */
    constructor(user?: UserEntity, authTime?: Date)
    {
        super();

        this.user = user;
        this.authTime = authTime;
    }


    public getUserClaimValue(subject: string, claimName: string, languageTag?: string): any
    {
        // Return null if 'user' doesn't exist in the session.
        if (!this.user)
        {
            return null;
        }

        // Return the claim value.
        return this.user.getClaim(claimName, languageTag);
    }


    public getUserAuthenticatedAt(): number
    {
        // Return 0 if 'user' and 'authTime' are not given.
        if (!this.user || !this.authTime)
        {
            return 0;
        }

        // Return the authentication time in seconds.
        return Math.round( this.authTime.getTime() / 1000 );
    }


    public getUserSubject(): string | null
    {
        // Return null if 'user' doesn't exist.
        if (!this.user)
        {
            return null;
        }

        // The subject (= unique identifier) of the end-user.
        return this.user.subject;
    }
}