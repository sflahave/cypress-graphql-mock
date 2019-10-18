"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
/// <reference types="cypress" />
var graphql_1 = require("graphql");
var graphql_2 = require("graphql");
var graphql_tools_1 = require("graphql-tools");
var commonMocks = null;
var commonOptions = null;
var wait = function(timeout) {
  return function(response) {
    return new Promise(function(resolve) {
      return setTimeout(function() {
        return resolve(response);
      }, timeout);
    });
  };
};
/**
 * Add .baseGraphqlMocks() to the Cypress chain. Used when we want to set the
 * mocks as common between multiple commands.
 */
exports.setBaseGraphqlMocks = function(mocks) {
  if (!commonMocks) {
    commonMocks = mocks;
  } else {
    throw new Error(
      "setBaseGraphqlMocks may only be called once, already called."
    );
  }
  return mocks;
};
/**
 * Add .baseGraphqlMocks() to the Cypress chain. Used when we want to set the
 * mocks as common between multiple commands.
 */
exports.setBaseOperationOptions = function(options) {
  if (!commonOptions) {
    commonOptions = options;
  } else {
    throw new Error(
      "setBaseOperationOptions may only be called once, already called."
    );
  }
  return options;
};
/**
 * Adds a .mockGraphql() and .mockGraphqlOps() methods to the cypress chain.
 *
 * The .mockGraphql should be called in the cypress "before" or "beforeEach" block
 * config to setup the server.
 *
 * By default, it will use the /graphql endpoint, but this can be changed
 * depending on the server implementation
 *
 * It takes an "operations" object, representing the named operations
 * of the GraphQL server. This is combined with the "mocks" option,
 * to modify the output behavior per test.
 *
 * The .mockGraphqlOps() allows you to configure the mock responses at a
 * more granular level
 *
 * For example, if we has a query called "UserQuery" and wanted to
 * explicitly force a state where a viewer is null (logged out), it would
 * look something like:
 *
 * .mockGraphqlOps({
 *   operations: {
 *     UserQuery: {
 *       viewer: null
 *     }
 *   }
 * })
 */
Cypress.Commands.add("mockGraphql", function(options) {
  var mergedOptions = tslib_1.__assign(
    tslib_1.__assign({}, commonOptions || {}),
    options || {}
  );
  var _a = mergedOptions.endpoint,
    endpoint = _a === void 0 ? "/graphql" : _a,
    _b = mergedOptions.delay,
    delay = _b === void 0 ? 0 : _b,
    _c = mergedOptions.operations,
    operations = _c === void 0 ? {} : _c,
    _d = mergedOptions.mocks,
    mocks = _d === void 0 ? {} : _d,
    _e = mergedOptions.schema,
    schema = _e === void 0 ? undefined : _e;
  if (!schema) {
    throw new Error(
      "Schema must be provided to the mockGraphql or setBaseOperationOptions"
    );
  }
  var executableSchema = graphql_tools_1.makeExecutableSchema({
    typeDefs: schemaAsSDL(schema)
  });
  graphql_tools_1.addMockFunctionsToSchema({
    schema: executableSchema,
    mocks: tslib_1.__assign(tslib_1.__assign({}, commonMocks), mocks)
  });
  var currentDelay = delay;
  var currentOps = operations;
  cy.on("window:before:load", function(win) {
    var originalFetch = win.fetch;
    function fetch(input, init) {
      if (typeof input !== "string") {
        throw new Error(
          "Currently only support fetch(url, options), saw fetch(Request)"
        );
      }
      if (input.indexOf(endpoint) !== -1 && init && init.method === "POST") {
        var payload = JSON.parse(init.body);
        var operationName = payload.operationName,
          query = payload.query,
          variables = payload.variables;
        var rootValue_1 = getRootValue(currentOps, operationName, variables);
        if (
          // Additional checks here because of transpilation.
          // We will loose instanceof if we are not using specific babel plugin, or using pure TS to compile front-end
          rootValue_1 instanceof graphql_1.GraphQLError ||
          rootValue_1.constructor === graphql_1.GraphQLError ||
          rootValue_1.constructor.name === "GraphQLError"
        ) {
          return Promise.resolve()
            .then(wait(currentDelay))
            .then(function() {
              return new Response(
                JSON.stringify({
                  data: {},
                  errors: [rootValue_1]
                })
              );
            });
        }
        return graphql_1
          .graphql({
            schema: executableSchema,
            source: query,
            variableValues: variables,
            operationName: operationName,
            rootValue: rootValue_1
          })
          .then(wait(currentDelay))
          .then(function(data) {
            return new Response(JSON.stringify(data));
          });
      }
      return originalFetch(input, init);
    }
    cy.stub(win, "fetch", fetch).as("fetchStub");
  });
  //
  cy.wrap({
    setOperations: function(options) {
      currentDelay = options.delay || 0;
      currentOps = tslib_1.__assign(
        tslib_1.__assign({}, currentOps),
        options.operations
      );
    }
  }).as(getAlias(mergedOptions));
});
Cypress.Commands.add("mockGraphqlOps", function(options) {
  cy.get("@" + getAlias(options)).invoke("setOperations", options);
});
var getAlias = function(_a) {
  var name = _a.name,
    endpoint = _a.endpoint;
  if (name || endpoint) {
    return "mockGraphqlOps:" + (name || endpoint);
  }
  return "mockGraphqlOps";
};
// Takes the schema either as the full .graphql file (string) or
// the introspection object.
function schemaAsSDL(schema) {
  if (typeof schema === "string" || Array.isArray(schema)) {
    return schema;
  }
  return graphql_2.printSchema(graphql_2.buildClientSchema(schema));
}
function getRootValue(operations, operationName, variables) {
  if (!operationName || !operations[operationName]) {
    return {};
  }
  var op = operations[operationName];
  if (typeof op === "function") {
    try {
      return op(variables);
    } catch (e) {
      return e; // properly handle dynamic throw new GraphQLError("message")
    }
  }
  return op;
}
