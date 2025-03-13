import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const translateClient = new TranslateClient({});

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayEvent) => {
    try {
        const isbn = event.pathParameters?.isbn;
        const targetLanguage = event.queryStringParameters?.language;

        if (!isbn || !targetLanguage) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing ISBN or target language" }) };
        }

        const getCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { isbn },
        });

        const data = await docClient.send(getCommand);
        if (!data.Item) {
            return { statusCode: 404, body: JSON.stringify({ error: "Book not found" }) };
        }

        if (data.Item.translations && data.Item.translations[targetLanguage]) {
            return {
                statusCode: 200,
                body: JSON.stringify({ translation: data.Item.translations[targetLanguage] }),
            };
        }

        const translateCommand = new TranslateTextCommand({
            Text: data.Item.description,
            SourceLanguageCode: "en",
            TargetLanguageCode: targetLanguage,
        });

        const translationResult = await translateClient.send(translateCommand);
        const translatedText = translationResult.TranslatedText;

        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { isbn },
            UpdateExpression: "SET translations.#lang = :text",
            ExpressionAttributeNames: { "#lang": targetLanguage },
            ExpressionAttributeValues: { ":text": translatedText },
        });

        await docClient.send(updateCommand);

        return { statusCode: 200, body: JSON.stringify({ translation: translatedText }) };
    } catch (error) {
        if (error instanceof Error) {
            console.error("Translation error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Translation failed", details: error.message }),
            };
        } else {
            console.error("Unknown error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Translation failed", details: "Unknown error" }),
            };
        }
    }
};
