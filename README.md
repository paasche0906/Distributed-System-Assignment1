## Serverless REST Assignment - Distributed Systems.

__Name:__ Jiacheng Pan

__Demo:__ [... link to your YouTube video demonstration ......](https://youtu.be/takckuLbws8)

### Context.

Context: Book Management API

Table item attributes:
+ isbn - string (Partition key)
+ title - string
+ author - string
+ year - number
+ description - string

### App API endpoints.
 
+ GET /books - Retrieve all books.
+ GET /books/{isbn} - Retrieve book details by ISBN.
+ GET /books/{year/author/title} - Retrieve book details by year/author/title.
+ GET /books/{year&author&title} - Retrieve book details by year& author& title.
+ GET /books/{isbn}/translation?language={lang} - Retrieve the translated description of a book in the specified language.
+ POST /books - Add a new book.
+ DELETE /books/{isbn} - Delete book by ISBN.


### Features.

#### Translation persistence

The translation feature caches previously translated book descriptions in DynamoDB to reduce the number of Amazon Translate API calls. Translations are stored under the translations attribute as key-value pairs, where the key is the language code and the value is the translated text.

+ isbn - string (Partition key)
+ title - string
+ author - string
+ year - number
+ description - string
+ translations - Map<string, string> (Stores translated book descriptions)

#### Custom L2 Construct

A custom L2 construct is used to provision API Gateway endpoints with Lambda integrations, API key protection, and DynamoDB access.
This construct provisions:
- A DynamoDB table to store book information.
- Multiple AWS Lambda functions to handle book management operations (CRUD + translation).
- An API Gateway to expose the Lambda functions as RESTful endpoints.
- An API Key and Usage Plan for securing certain API routes.

Construct Input props object:
~~~ts
type BookApiProps = {
  tableName?: string;
  apiName?: string;
}
~~~
~~~ts
constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new BookApiConstruct(this, 'BookApi');
  }
~~~
Construct public properties
~~~ts
export class BookApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;
}
~~~


#### Multi-Stack app

The project is divided into multiple stacks:
- BookManagementApiStack - Manages API Gateway, Lambda functions, and DynamoDB table.
- AuthStack - Handles API authentication and API keys.
- TranslationStack - Manages the translation functionality using Amazon Translate.


#### API Keys. 

To secure API Gateway endpoints using API keys, we follow these steps:
- Create an API Key using apiGateway.addApiKey().
~~~ts
const apiKey = this.api.addApiKey("BookManagementApiKey", {
    apiKeyName: "BookManagementApiKey",
    description: "API Key for protected endpoints"
});
~~~
- Define a Usage Plan that limits API request rates.
~~~ts
const usagePlan = this.api.addUsagePlan("BookManagementUsagePlan", {
    name: "BookManagementUsagePlan",
    description: "Usage plan for API Key",
    throttle: {
        rateLimit: 10,  // Max 10 requests per second
        burstLimit: 20,  // Max 20 requests at once
    },
});
~~~
- Associate the API Key with the Usage Plan to enforce authentication.
~~~ts
usagePlan.addApiStage({
    stage: this.api.deploymentStage,
});
usagePlan.addApiKey(apiKey);
~~~
- Protect specific API routes by setting apiKeyRequired: true in method options.
~~~ts
const protectedMethodOptions = {
    apiKeyRequired: true,
};

// Protect the POST (Create Book) endpoint
booksResource.addMethod('POST', new apigateway.LambdaIntegration(createBookLambda), protectedMethodOptions);
// Protect the PUT (Update Book) endpoint
book.addMethod('PUT', new apigateway.LambdaIntegration(updateBookLambda), protectedMethodOptions);
// Protect the DELETE (Delete Book) endpoint
book.addMethod('DELETE', new apigateway.LambdaIntegration(deleteBookLambda), protectedMethodOptions);
~~~