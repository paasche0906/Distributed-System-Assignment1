import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
    });

    const data = await docClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ books: data.Items }),
    };
  } catch (error) {
    console.error("Error fetching books:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not retrieve books" }),
    };
  }
};
