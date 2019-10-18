"use strict";
var plugin_helpers_1 = require("@graphql-codegen/plugin-helpers");
var graphql_1 = require("graphql");
module.exports = {
  plugin: function(schema, documents, config) {
    var additionalImports = "";
    var tPrefix = "";
    if (config && config.typesFile) {
      additionalImports +=
        "import * as t from " + JSON.stringify(config.typesFile);
      tPrefix = "t.";
    }
    var allTypes = schema.getTypeMap();
    var documentOperations = [];
    var MockOperationTypes = [];
    documents.forEach(function(d) {
      return d.content.definitions.forEach(function(node) {
        if (
          graphql_1.isExecutableDefinitionNode(node) &&
          node.kind === graphql_1.Kind.OPERATION_DEFINITION &&
          node.name
        ) {
          documentOperations.push({
            name: node.name.value,
            op: node.operation
          });
        }
      });
    });
    documentOperations.forEach(function(o) {
      var typeVal =
        "" + tPrefix + plugin_helpers_1.toPascalCase(o.name + "_" + o.op);
      MockOperationTypes.push(
        o.name +
          ": ErrorOrValue<" +
          typeVal +
          " | PartialDeep<" +
          typeVal +
          ">>"
      );
    });
    var MockBaseTypesBody = Object.keys(allTypes)
      .sort()
      .map(function(typeName) {
        if (typeName.startsWith("__")) {
          return "";
        }
        var pascalName = plugin_helpers_1.toPascalCase(typeName);
        var type = allTypes[typeName];
        var typeVal = "unknown";
        if (graphql_1.isScalarType(type)) {
          typeVal = "MockResolve<" + tPrefix + "Scalars['" + typeName + "']>;";
        } else if (
          graphql_1.isInterfaceType(type) ||
          graphql_1.isUnionType(type)
        ) {
          typeVal = schema
            .getPossibleTypes(type)
            .map(function(t) {
              return "TypeMock<" + tPrefix + t.name + ">";
            })
            .join(" | ");
        } else if (graphql_1.isObjectType(type)) {
          typeVal = "TypeMock<" + tPrefix + pascalName + ">";
        } else if (graphql_1.isEnumType(type)) {
          typeVal = "MockResolve<" + tPrefix + pascalName + ">";
        }
        return typeName + "?: " + typeVal;
      });
    return (
      "\n" +
      additionalImports +
      '\nimport { GraphQLResolveInfo, GraphQLError } from "graphql";\n\nexport type MockResolve<T> = (\n  obj: any,\n  args: any,\n  ctx: any,\n  info: GraphQLResolveInfo\n) => T;\n\nexport type ErrorOrValue<T> = T | GraphQLError;\n\nexport type ResolverOrValue<T> = T | MockResolve<T>;\n\nexport type PartialDeep<T> = { [P in keyof T]?: PartialDeep<T[P]> };\n\nexport type PartialResolveDeep<T> = T extends object ? {\n  [P in keyof T]?: ResolverOrValue<PartialResolveDeep<T[P]>>\n} : T;\n\nexport type TypeMock<T> = () => PartialResolveDeep<T>;\n\ndeclare global {\n  interface CypressMockBaseTypes {\n    ' +
      MockBaseTypesBody.join("\n") +
      "\n  }\n  interface CypressMockOperationTypes {\n    " +
      MockOperationTypes.join("\n") +
      "\n  }\n}\n"
    );
  }
};
