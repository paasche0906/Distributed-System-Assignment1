import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
    console.log("Received event:", JSON.stringify(event));

    const isbn = event.pathParameters?.isbn;
    if (!isbn) {
        return { statusCode: 400, body: JSON.stringify({ error: "ISBN is required" }) };
    }

    try {
        const command = new GetCommand({ TableName: TABLE_NAME, Key: { isbn } });
        const data = await docClient.send(command);

        if (!data.Item) {
            return { statusCode: 404, body: JSON.stringify({ error: "Book not found" }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data.Item),
        };
    } catch (error) {
        console.error("Error fetching book:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Could not retrieve book" }) };
    }
};
