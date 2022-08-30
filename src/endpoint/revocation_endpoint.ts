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


import { RevocationRequestHandler } from 'https://deno.land/x/authlete_deno_oak@v1.0.2/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { BaseEndpoint } from './base_endpoint.ts';


/**
 * An implementation of revocation endpoint ([RFC 7009](https://tools.ietf.org/html/rfc7009)).
 */
export class RevocationEndpoint extends BaseEndpoint
{
    /**
     * The revocation endpoint for `POST` method.
     *
     * See also "[RFC 7009, 2.1. Revocation Request](http://tools.ietf.org/html/rfc7009#section-2.1)".
     */
    public async handlePost(ctx: Context): Promise<void>
    {
        await new RevocationRequestHandler(this.api).handle(ctx);
    }
}