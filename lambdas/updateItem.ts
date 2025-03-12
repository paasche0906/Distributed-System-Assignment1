import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
    try {
        const { partition_key, sort_key } = event.pathParameters || {};
        const body = JSON.parse(event.body || "{}");
        const { data } = body;

        if (!partition_key || !sort_key || !data) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing required fields" }),
            };
        }

        const params = {
            TableName: TABLE_NAME,
            Key: {
                partitionKey: partition_key,
                sortKey: sort_key,
            },
            UpdateExpression: "SET data = :data",
            ExpressionAttributeValues: {
                ":data": data,
            },
        };

        await docClient.send(new UpdateCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Item updated successfully" }),
        };
    } catch (error) {
        console.error("Error updating item:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not update item" }),
        };
    }
};
