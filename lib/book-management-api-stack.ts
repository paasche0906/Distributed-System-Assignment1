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

    // Lambda Functions - Translation
    const translateBookLambda = new lambda.Function(this, 'TranslateBookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'translateBook.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: { TABLE_NAME: bookTable.tableName },
    });

    // Give Lambda permission to read DynamoDB.
    bookTable.grantReadData(getBookLambda);
    bookTable.grantReadData(getAllBooksLambda);
    bookTable.grantWriteData(createBookLambda);
    bookTable.grantWriteData(updateBookLambda);
    bookTable.grantWriteData(deleteBookLambda);
    bookTable.grantWriteData(translateBookLambda);

    // Create the API Gateway
    const api = new apigateway.RestApi(this, 'BookManagementApi', {
      restApiName: 'Book Management Service',
      description: 'This API allows managing books.',
    });

    const booksResource = api.root.addResource('books');
    const book = booksResource.addResource('{isbn}');

    // Add the GET endpoint
    book.addMethod('GET', new apigateway.LambdaIntegration(getBookLambda));
    // Add GET all books endpoint
    booksResource.addMethod('GET', new apigateway.LambdaIntegration(getAllBooksLambda));
    // Add the POST endpoint
    booksResource.addMethod('POST', new apigateway.LambdaIntegration(createBookLambda));
    // Add the PUT endpoint
    book.addMethod('PUT', new apigateway.LambdaIntegration(updateBookLambda));
    // Add the DELETE endpoint
    book.addMethod('DELETE', new apigateway.LambdaIntegration(deleteBookLambda));
    // Add GET /books/{isbn}/translation endpoint
    const bookTranslation = book.addResource('translation');
    bookTranslation.addMethod('GET', new apigateway.LambdaIntegration(translateBookLambda));

    // Export API Gateway endpoints
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url! });
  }
}
