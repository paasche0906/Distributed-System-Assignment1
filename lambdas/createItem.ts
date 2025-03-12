import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const { partitionKey, sortKey, data } = body;

        if (!partitionKey || !sortKey || !data) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing required fields" }),
            };
        }

        const params = {
            TableName: TABLE_NAME,
            Item: {
                partitionKey,
                sortKey,
                data,
            },
        };

        await docClient.send(new PutCommand(params));

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Item added successfully" }),
        };
    } catch (error) {
        console.error("Error adding item:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not add item" }),
        };
    }
};
