import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class BookManagementApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Booklist
    const bookTable = new dynamodb.Table(this, 'BooksTable', {
      partitionKey: { name: 'isbn', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Functions:
    // Lambda Functions - GET Book Information by ID
    const getBookLambda = new lambda.Function(this, 'GetBookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getBook.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: { TABLE_NAME: bookTable.tableName },
    });

    // Lambda Functions - Get All Books
    const getAllBooksLambda = new lambda.Function(this, 'GetAllBooksFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getAllBooks.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: { TABLE_NAME: bookTable.tableName },
    });

    // Lambda Functions - POST Book Information
    const createBookLambda = new lambda.Function(this, 'CreateBookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'createBook.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: { TABLE_NAME: bookTable.tableName },
    });

    // Lambda Functions - Update Book Information
    const updateBookLambda = new lambda.Function(this, 'UpdateBookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'updateBook.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: { TABLE_NAME: bookTable.tableName },
    });

    // Lambda Functions - Delete Book Information
    const deleteBookLambda = new lambda.Function(this, 'DeleteBookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'deleteBook.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: { TABLE_NAME: bookTable.tableName },
    });

    // Lambda Function - Translate Book Description
    const translateBookLambda = new lambda.Function(this, 'TranslateBookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'translateBook.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: {
        TABLE_NAME: bookTable.tableName,
        REGION: this.region,
      },
    });

    // Give Lambda permission to read DynamoDB.
    bookTable.grantReadData(getBookLambda);
    bookTable.grantReadData(getAllBooksLambda);
    bookTable.grantWriteData(createBookLambda);
    bookTable.grantWriteData(updateBookLambda);
    bookTable.grantWriteData(deleteBookLambda);
    bookTable.grantReadData(translateBookLambda);

    // Allow Lambda to access Amazon Translate
    translateBookLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "translate:TranslateText",
        "comprehend:DetectDominantLanguage"
      ],
      resources: ["*"],
    }));

    // Create the API Gateway
    const api = new apigateway.RestApi(this, 'BookManagementApi', {
      restApiName: 'Book Management Service',
      description: 'This API allows managing books.',
      deployOptions: {
        stageName: "prod"
      }
    });

    // Create the API Key
    const apiKey = api.addApiKey("BookManagementApiKey", {
      apiKeyName: "BookManagementApiKey",
      description: "API Key for protected endpoints"
    });

    // Create a Usage Plan and associate an API Key
    const usagePlan = api.addUsagePlan("BookManagementUsagePlan", {
      name: "BookManagementUsagePlan",
      description: "Usage plan for API Key",
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
    });
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });
    usagePlan.addApiKey(apiKey);

    const booksResource = api.root.addResource('books');
    const book = booksResource.addResource('{isbn}');
    const translationResource = book.addResource('translation');

    // Protected Lambda Endpoint Integration
    const protectedMethodOptions = {
      apiKeyRequired: true,
    };

    // Open endpoints
    // Add the GET endpoint
    book.addMethod('GET', new apigateway.LambdaIntegration(getBookLambda));
    // Add GET all books endpoint
    booksResource.addMethod('GET', new apigateway.LambdaIntegration(getAllBooksLambda));
    // API Gateway - New translation endpoint
    translationResource.addMethod('GET', new apigateway.LambdaIntegration(translateBookLambda));

    // Protected endpoint (requires API Key)
    // Add the POST endpoint
    booksResource.addMethod('POST', new apigateway.LambdaIntegration(createBookLambda), protectedMethodOptions);
    // Add the PUT endpoint
    book.addMethod('PUT', new apigateway.LambdaIntegration(updateBookLambda), protectedMethodOptions);
    // Add the DELETE endpoint
    book.addMethod('DELETE', new apigateway.LambdaIntegration(deleteBookLambda), protectedMethodOptions);

    // Export API Gateway endpoints
    new cdk.CfnOutput(this, "APIKey", { value: apiKey.keyId });
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url! });
  }
}
