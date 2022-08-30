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


import { AuthleteApi } from 'https://deno.land/x/authlete_deno@v1.2.9/mod.ts';


/**
 * Base endpoint.
 */
export class BaseEndpoint
{
    /**
     * The implementation of `AuthleteApi` interface.
     */
    protected api: AuthleteApi;


    /**
     * The constructor.
     *
     * @params api
     *          An implementation of `AuthleteApi` interface.
     */
    public constructor(api: AuthleteApi)
    {
        this.api = api;
    }
}