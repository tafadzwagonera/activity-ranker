export const getRuntimeLabel = (transport: "rest" | "graphql") =>
  transport === "graphql" ? "GraphQL transport" : "REST transport";
