import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing request body" }) };
        }

        const body = JSON.parse(event.body);
        const { isbn, title, author, year } = body;

        if (!isbn || !title || !author || !year) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
        }

        const params = {
            TableName: TABLE_NAME,
            Item: { isbn, title, author, year },
        };

        await docClient.send(new PutCommand(params));

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Book added successfully" }),
        };
    } catch (error) {
        console.error("Error adding book:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not add book" }),
        };
    }
};
