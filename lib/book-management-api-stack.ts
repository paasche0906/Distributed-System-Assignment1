import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class BookManagementApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Booklist
    const bookTable = new dynamodb.Table(this, 'BooksTable', {
      partitionKey: { name: 'isbn', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Functions - GET Book Information
    const getBookLambda = new lambda.Function(this, 'GetBookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getBook.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: { TABLE_NAME: bookTable.tableName },
    });

    // Give Lambda permission to read DynamoDB.
    bookTable.grantReadData(getBookLambda);

    // Create the API Gateway
    const api = new apigateway.RestApi(this, 'BookManagementApi', {
      restApiName: 'Book Management Service',
      description: 'This API allows managing books.',
    });

    // Add the GET /books/{isbn} endpoint
    const booksResource = api.root.addResource('books');
    const book = booksResource.addResource('{isbn}');
    book.addMethod('GET', new apigateway.LambdaIntegration(getBookLambda));

    // Export API Gateway endpoints
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url! });
  }
}
