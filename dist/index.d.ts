import { IntrospectionQuery } from "graphql";
export interface MockGraphQLOptions extends SetOperationsOpts {
    schema?: string | string[] | IntrospectionQuery;
    mocks?: CypressMockBaseTypes;
}
export interface SetOperationsOpts {
    name?: string;
    endpoint?: string;
    operations?: Partial<CypressMockOperationTypes>;
    delay?: number;
}
export interface GQLRequestPayload {
    operationName: Extract<keyof CypressMockOperationTypes, string>;
    query: string;
    variables: any;
}
declare global {
    interface CypressMockBaseTypes {
    }
    interface CypressMockOperationTypes extends Record<string, any> {
    }
    namespace Cypress {
        interface Chainable {
            mockGraphql(options?: MockGraphQLOptions): Cypress.Chainable;
            mockGraphqlOps(options?: SetOperationsOpts): Cypress.Chainable;
        }
    }
}
/**
 * Add .baseGraphqlMocks() to the Cypress chain. Used when we want to set the
 * mocks as common between multiple commands.
 */
export declare const setBaseGraphqlMocks: (mocks: CypressMockBaseTypes) => CypressMockBaseTypes;
/**
 * Add .baseGraphqlMocks() to the Cypress chain. Used when we want to set the
 * mocks as common between multiple commands.
 */
export declare const setBaseOperationOptions: (options: CypressMockBaseTypes) => CypressMockBaseTypes;
