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


import { NoInteractionHandlerSpi } from 'https://deno.land/x/authlete_deno_oak@v1.0.3/mod.ts';
import { AuthorizationRequestHandlerSpiImpl } from './authorization_request_handler_spi_impl.ts';


/**
 * Implementation of `NoInteractionHandlerSpi` interface.
 *
 * This is supposed to be given to the constructor of `NoInteractionHandler`.
 */
export class NoInteractionHandlerSpiImpl
    extends AuthorizationRequestHandlerSpiImpl implements NoInteractionHandlerSpi
{
    public isUserAuthenticated(): boolean
    {
        return this.getUserSubject() !== null;
    }
}