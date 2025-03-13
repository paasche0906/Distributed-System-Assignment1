import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
    try {
        const isbn = event.pathParameters?.isbn;

        if (!isbn) {
            return { statusCode: 400, body: JSON.stringify({ error: "ISBN is required" }) };
        }

        const params = {
            TableName: TABLE_NAME,
            Key: { isbn },
        };

        await docClient.send(new DeleteCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Book with ISBN ${isbn} deleted successfully` }),
        };
    } catch (error) {
        console.error("Error deleting book:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not delete book", details: (error as Error).message }),
        };
    }
};
