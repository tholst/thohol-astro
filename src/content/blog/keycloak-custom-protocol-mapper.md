---
title: "Keycloak: custom claims from external systems"
description: Implementing a Custom Protocol Mapper for authenticated GraphQL queries
pubDate: 2020-08-08
updatedDate: 
---

I am using a **Custom Protocol Mapper**<sup>1</sup> to send an **authenticated**<sup>2</sup> **GraphQL query**<sup>3</sup> to an external system and put the JSON response data into the user's access token (JWT). It currently runs with Keycloak 10.

==> You can find the full code in [this repository][1].

### (1) Custom Protocol Mapper
As others have noted, your project needs at least 3 files.

1. A Java class that implements `AbstractOIDCProtocolMapper` & its method `setClaim` (among others).
1. A `jboss-deployment-structure.xml` file that contains the dependencies for deployment.
1. An `org.keycloak.protocol.ProtocolMapper` file that contains the full name of the custom protocol mapper.

Here is the folder structure:
```bash
$ tree src/ -A
src/
└── main
    ├── java
    │   └── com
    │       └── thohol
    │           └── keycloak
    │               └── JsonGraphQlRemoteClaim.java
    └── resources
        └── META-INF
            ├── jboss-deployment-structure.xml
            └── services
                └── org.keycloak.protocol.ProtocolMapper

```

### (2) Authenticated Remote Requests

If the **remote endpoint requires authentication**, we can **obtain an Access Token from Keycloak**. The complete flow would look as follows (especially steps 3-6):

1. A user sends an authentication request (i.e., "logs in") to Keycloak. The request is made against a specific Keycloak client, e.g., `login-client`.
2. Because the `login-client` is configured to use the Custom Protocol Mapper, its code gets executed while the user's authentication request is being processed.
3. The Custom Protocol Mapper sends a second authentication request to Keycloak. The request is made against a *second* Keycloak client (e.g., `remote-claims-client`) using `client_credentials` (Client ID + Secret).
4. The Custom Protocol Mapper receives an access token for client `remote-claims-client`.
5. The Custom Protocol Mapper sends a request to the remote endpoint. An `Authorization: Bearer <access token>` header is added to the request headers.
6. The remote endpoint receives the request and validates the JWT token. In many cases, access should be restricted further. For example, to only allow tokens minted ("written") for the corresponding `remote-claims-client`.
7. The remote endpoint returns the custom remote claims data.
8. The Custom Protocol Mapper receives the custom remote claims data and puts it into the user's access token.
9. Keycloak returns an access token with custom claims to the user.


Steps 3/4 can be implemented as a simple HTTP POST request in Java (error handling omitted!):
```java
// Call remote service
HttpClient httpClient = HttpClient.newHttpClient();
URIBuilder uriBuilder = new URIBuilder(keycloakAuthUrl);
URI uri = uriBuilder.build();

HttpRequest.Builder builder = HttpRequest.newBuilder().uri(uri);
String queryBody = "grant_type=client_credentials&client_id=remote-claims-client&client_secret=dfebc62a-e8d7-4ab3-9196-258ddb5684ab";
builder.POST(HttpRequest.BodyPublishers.ofString(queryBody));

// Build headers
builder.header(HttpHeaders.CONTENT_TYPE , MediaType.APPLICATION_FORM_URLENCODED);

// Call
HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());

// Process Response
JsonNode json = return new ObjectMapper().readTree(response.body());
String accessToken = json.findValue("access_token").asText();
```

### (3) Using GraphQL Queries for external requests

A GraphQL query is essentially an HTTP POST request, with a `body` like
```json
{
    "query": "query HeroName($episode: Episode) {
        hero(episode: $episode) {
            name
        }
    }",
    "variables": {
        "episode" : "JEDI"
    }
}
```

This can be sent from Java like (error handling omitted!):
```java
HttpClient httpClient = HttpClient.newHttpClient();
URIBuilder uriBuilder = new URIBuilder(remoteUrl);
URI uri = uriBuilder.build();

HttpRequest.Builder builder = HttpRequest.newBuilder().uri(uri);
String queryBody = "{
    \"query\": \"query HeroName($episode: Episode) {
        hero(episode: $episode) {
            name
        }
    }\",
    \"variables\": {
        \"episode\" : \"JEDI\"
    }
}";
builder.POST(HttpRequest.BodyPublishers.ofString(queryBody));

// Build headers
builder.header(HttpHeaders.CONTENT_TYPE , MediaType.APPLICATION_JSON);
builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);

// Call
HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());

// Process Response and add to token
JsonNode json = return new ObjectMapper().readTree(response.body());
clientSessionCtx.setAttribute("custom_claims", json);
```


### Disclaimer
I am the owner/author of the linked repository. However, I did not start from scratch but used multiple other repositories as basis/inspiration. See the [repo's README][2].


  [1]: https://github.com/tholst/keycloak-json-graphql-remote-claim
  [2]: https://github.com/tholst/keycloak-json-graphql-remote-claim/blob/master/README.md