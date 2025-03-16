import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const dynamoDB = new DynamoDBClient({});
const translateClient = new TranslateClient({});

export const handler = async (event: any) => {
    const tableName = process.env.TABLE_NAME!;
    const { isbn } = event.pathParameters;
    const language = event.queryStringParameters?.language || 'en';

    try {
        // Query DynamoDB to check if there is a translation cache already in place
        const bookData = await dynamoDB.send(new GetItemCommand({
            TableName: tableName,
            Key: { isbn: { S: isbn } },
        }));

        if (!bookData.Item) {
            return { statusCode: 404, body: JSON.stringify({ error: "Book not found" }) };
        }

        const description = bookData.Item.description?.S || 'No description available';
        const translations = bookData.Item.translations?.M || {};

        // Checking the cache
        if (translations[language]) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    isbn,
                    originalDescription: description,
                    translatedDescription: translations[language].S,
                    targetLanguage: language,
                    cacheUsed: true
                }),
            };
        }

        // Translate
        const translationResult = await translateClient.send(new TranslateTextCommand({
            Text: description,
            SourceLanguageCode: "auto",
            TargetLanguageCode: language,
        }));

        const translatedText = translationResult.TranslatedText;

        // Storing into DynamoDB to cache translation results
        await dynamoDB.send(new UpdateItemCommand({
            TableName: tableName,
            Key: { isbn: { S: isbn } },
            UpdateExpression: "SET translations.#lang = :translatedText",
            ExpressionAttributeNames: { "#lang": language },
            ExpressionAttributeValues: { ":translatedText": { S: translatedText || "" } },
        }));


        return {
            statusCode: 200,
            body: JSON.stringify({
                isbn,
                originalDescription: description,
                translatedDescription: translatedText,
                targetLanguage: language,
                cacheUsed: false
            }),
        };

    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
