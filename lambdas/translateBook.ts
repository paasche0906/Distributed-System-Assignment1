import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const dynamoDB = new DynamoDBClient({});
const translateClient = new TranslateClient({});

export const handler = async (event: any) => {
    const tableName = process.env.TABLE_NAME!;
    const { isbn } = event.pathParameters;
    const language = event.queryStringParameters?.language || 'en';

    try {
        const bookData = await dynamoDB.send(new GetItemCommand({
            TableName: tableName,
            Key: { isbn: { S: isbn } },
        }));

        if (!bookData.Item) {
            return { statusCode: 404, body: JSON.stringify({ error: "Book not found" }) };
        }

        const description = bookData.Item.description?.S || 'No description available';

        const translationResult = await translateClient.send(new TranslateTextCommand({
            Text: description,
            SourceLanguageCode: "auto",
            TargetLanguageCode: language,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                isbn,
                originalDescription: description,
                translatedDescription: translationResult.TranslatedText,
                targetLanguage: language
            }),
        };

    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
