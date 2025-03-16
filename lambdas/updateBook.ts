import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const translateClient = new TranslateClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const TEXT_ATTRIBUTE = "description";

export const handler = async (event: APIGatewayEvent) => {
    try {
        const partitionKey = event.pathParameters?.partition_key;
        const sortKey = event.pathParameters?.sort_key;
        const targetLanguage = event.queryStringParameters?.language;

        if (!partitionKey || !sortKey || !targetLanguage) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required parameters" }) };
        }

        //Check if DynamoDB has cached translations
        const getItemCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { partitionKey, sortKey }
        });
        const result = await docClient.send(getItemCommand);

        if (!result.Item) {
            return { statusCode: 404, body: JSON.stringify({ error: "Item not found" }) };
        }

        // Checking for existing translations
        const translations = result.Item.translations || {};
        if (translations[targetLanguage]) {
            return {
                statusCode: 200,
                body: JSON.stringify({ translation: translations[targetLanguage] })
            };
        }

        // Call Amazon Translate
        const textToTranslate = result.Item[TEXT_ATTRIBUTE];
        if (!textToTranslate) {
            return { statusCode: 400, body: JSON.stringify({ error: `${TEXT_ATTRIBUTE} is missing or empty` }) };
        }

        const translateCommand = new TranslateTextCommand({
            SourceLanguageCode: "en",
            TargetLanguageCode: targetLanguage,
            Text: textToTranslate
        });
        const translationResult = await translateClient.send(translateCommand);
        const translatedText = translationResult.TranslatedText;

        // Updating the DynamoDB Cache Translation
        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { partitionKey, sortKey },
            UpdateExpression: "SET translations.#lang = :text",
            ExpressionAttributeNames: { "#lang": targetLanguage },
            ExpressionAttributeValues: { ":text": translatedText },
            ReturnValues: "UPDATED_NEW"
        });
        await docClient.send(updateCommand);

        // Return to Translation Results
        return {
            statusCode: 200,
            body: JSON.stringify({ translation: translatedText })
        };
    } catch (error) {
        console.error("Translation error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Translation failed", details: (error as Error).message })
        };
    }
};
