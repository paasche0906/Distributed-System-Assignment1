import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
    try {
        const queryParams = event.queryStringParameters || {};
        const filterExpressions: string[] = [];
        const expressionAttributeValues: Record<string, any> = {};

        if (queryParams.author) {
            filterExpressions.push("author = :author");
            expressionAttributeValues[":author"] = queryParams.author;
        }
        if (queryParams.year) {
            const yearValue = Number(queryParams.year);
            if (isNaN(yearValue)) {
                return { statusCode: 400, body: JSON.stringify({ error: "Invalid year format" }) };
            }
            filterExpressions.push("#year = :year");
            expressionAttributeValues[":year"] = yearValue;
        }

        let filterExpression = filterExpressions.length > 0 ? filterExpressions.join(" AND ") : undefined;

        const command = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: Object.keys(expressionAttributeValues).length ? expressionAttributeValues : undefined,
            ExpressionAttributeNames: queryParams.year ? { "#year": "year" } : undefined,
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
            body: JSON.stringify({ error: "Could not retrieve books", details: (error as Error).message }),
        };
    }
};
