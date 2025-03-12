import { DynamoDB } from 'aws-sdk';
import { APIGatewayEvent } from 'aws-lambda';

const db = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME!;

export async function handler(event: APIGatewayEvent) {
  const partitionKey = event.pathParameters?.partition_key;

  if (!partitionKey) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Partition key is required' }),
    };
  }

  try {
    const result = await db.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'partitionKey = :pk',
      ExpressionAttributeValues: { ':pk': partitionKey },
    }).promise();

    return { statusCode: 200, body: JSON.stringify(result.Items) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Error fetching data', error }) };
  }
}
