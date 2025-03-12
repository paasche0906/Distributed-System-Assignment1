import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class Assignment1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB table
    const table = new dynamodb.Table(this, 'ItemsTable', {
      partitionKey: { name: 'partitionKey', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sortKey', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda Functions - GET
    const getItemsLambda = new lambda.Function(this, 'GetItemsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getItems.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Create Lambda Functions - POST
    const createItemLambda = new lambda.Function(this, 'CreateItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'createItem.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: { TABLE_NAME: table.tableName },
    });

    // Give Lambda access to DynamoDB
    table.grantReadData(getItemsLambda);
    table.grantWriteData(createItemLambda);

    // Create the API Gateway
    const api = new apigateway.RestApi(this, 'ServerlessApi', {
      restApiName: 'Serverless Service',
      description: 'This API serves as a CRUD endpoint for DynamoDB.',
    });

    // Add GET /items/{partition_key} endpoints
    const itemsResource = api.root.addResource('items');
    const item = itemsResource.addResource('{partition_key}');
    item.addMethod('GET', new apigateway.LambdaIntegration(getItemsLambda));

    // Add POST /items
    itemsResource.addMethod('POST', new apigateway.LambdaIntegration(createItemLambda));

    // Export API Gateway endpoints
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url! });
  }
}
