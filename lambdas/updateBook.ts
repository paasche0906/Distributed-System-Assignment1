import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
    try {
        const isbn = event.pathParameters?.isbn;
        if (!isbn) {
            return { statusCode: 400, body: JSON.stringify({ error: "ISBN is required" }) };
        }

        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing request body" }) };
        }

        const body = JSON.parse(event.body);
        const { title, author, year } = body;

        if (!title && !author && !year) {
            return { statusCode: 400, body: JSON.stringify({ error: "At least one field must be updated" }) };
        }

        let updateExpression = "SET ";
        const expressionAttributeValues: Record<string, any> = {};
        const expressionAttributeNames: Record<string, string> = {};

        if (title) {
            updateExpression += "#title = :title, ";
            expressionAttributeValues[":title"] = title;
            expressionAttributeNames["#title"] = "title";
        }
        if (author) {
            updateExpression += "#author = :author, ";
            expressionAttributeValues[":author"] = author;
            expressionAttributeNames["#author"] = "author";
        }
        if (year) {
            updateExpression += "#year = :year, ";
            expressionAttributeValues[":year"] = year;
            expressionAttributeNames["#year"] = "year";
        }


        updateExpression = updateExpression.slice(0, -2);

        const params = {
            TableName: TABLE_NAME,
            Key: { isbn },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: ReturnValue.ALL_NEW,
        };

        const response = await docClient.send(new UpdateCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Book updated successfully", updatedBook: response.Attributes }),
        };
    } catch (error) {
        console.error("Error updating book:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not update book", details: (error as Error).message }),
        };
    }
};
