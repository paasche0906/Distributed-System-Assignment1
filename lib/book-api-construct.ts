import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class BookApiConstruct extends Construct {
    public readonly api: apigateway.RestApi;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Create a DynamoDB table
        const bookTable = new dynamodb.Table(this, 'BooksTable', {
            partitionKey: { name: 'isbn', type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Lambda Role
        const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess')
            ]
        });

        // Lambda Shared Configuration
        const lambdaProps = {
            runtime: lambda.Runtime.NODEJS_18_X,
            code: lambda.Code.fromAsset('lambdas'),
            environment: { TABLE_NAME: bookTable.tableName },
            role: lambdaRole
        };

        // Lambda Functions
        const getBookLambda = new lambda.Function(this, 'GetBookFunction', {
            handler: 'getBook.handler',
            ...lambdaProps
        });

        const getAllBooksLambda = new lambda.Function(this, 'GetAllBooksFunction', {
            handler: 'getAllBooks.handler',
            ...lambdaProps
        });

        const createBookLambda = new lambda.Function(this, 'CreateBookFunction', {
            handler: 'createBook.handler',
            ...lambdaProps
        });

        const updateBookLambda = new lambda.Function(this, 'UpdateBookFunction', {
            handler: 'updateBook.handler',
            ...lambdaProps
        });

        const deleteBookLambda = new lambda.Function(this, 'DeleteBookFunction', {
            handler: 'deleteBook.handler',
            ...lambdaProps
        });

        const translateBookLambda = new lambda.Function(this, 'TranslateBookFunction', {
            handler: 'translateBook.handler',
            ...lambdaProps,
            environment: {
                TABLE_NAME: bookTable.tableName,
                REGION: cdk.Stack.of(this).region,
            },
        });

        // Allow Lambda to access DynamoDB.
        bookTable.grantReadData(getBookLambda);
        bookTable.grantReadData(getAllBooksLambda);
        bookTable.grantWriteData(createBookLambda);
        bookTable.grantWriteData(updateBookLambda);
        bookTable.grantWriteData(deleteBookLambda);
        bookTable.grantReadData(translateBookLambda);

        // Allow Lambda acess Amazon Translate
        translateBookLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "translate:TranslateText",
                "comprehend:DetectDominantLanguage"
            ],
            resources: ["*"],
        }));

        // Create the API Gateway
        this.api = new apigateway.RestApi(this, 'BookManagementApi', {
            restApiName: 'Book Management Service',
            description: 'API for managing books.',
            deployOptions: {
                stageName: "prod"
            }
        });

        // Create the API Key
        const apiKey = this.api.addApiKey("BookManagementApiKey", {
            apiKeyName: "BookManagementApiKey",
            description: "API Key for protected endpoints"
        });

        // Create a Usage Plan and associate an API Key
        const usagePlan = this.api.addUsagePlan("BookManagementUsagePlan", {
            name: "BookManagementUsagePlan",
            description: "Usage plan for API Key",
            throttle: {
                rateLimit: 10,
                burstLimit: 20,
            },
        });
        usagePlan.addApiStage({
            stage: this.api.deploymentStage,
        });
        usagePlan.addApiKey(apiKey);

        // Define API resources
        const booksResource = this.api.root.addResource('books');
        const book = booksResource.addResource('{isbn}');
        const translationResource = book.addResource('translation');

        // API Key protection options
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
        new cdk.CfnOutput(this, 'ApiEndpoint', { value: this.api.url! });
    }
}
