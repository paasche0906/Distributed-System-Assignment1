import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
    console.log("Received event:", JSON.stringify(event));

    const partitionKey = event.pathParameters?.partition_key;

    if (!partitionKey) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing partition_key in request" }),
        };
    }

    const params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: "partitionKey = :pk",
        ExpressionAttributeValues: {
            ":pk": partitionKey,
        },
    };

    try {
        const command = new QueryCommand(params);
        const data = await docClient.send(command);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ items: data.Items || [] }),
        };
    } catch (error) {
        console.error("Error fetching items:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not retrieve items" }),
        };
    }
};
