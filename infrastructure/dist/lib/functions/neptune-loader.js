"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_neptune_1 = require("@aws-sdk/client-neptune");
const handler = async (event) => {
    const client = new client_neptune_1.NeptuneClient({ region: process.env.AWS_REGION });
    const command = new client_neptune_1.StartLoaderJobCommand({
        source: event.source,
        format: event.format,
        region: event.region,
        failOnError: event.failOnError,
        parallelism: event.parallelism,
        updateSingleCardinalityProperties: event.updateSingleCardinalityProperties,
        iamRoleArn: process.env.NEPTUNE_LOADER_ROLE_ARN
    });
    try {
        const response = await client.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify({
                loaderId: response.loaderId,
                status: 'STARTED'
            })
        };
    }
    catch (error) {
        console.error('Error starting loader job:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to start loader job',
                details: error.message
            })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmVwdHVuZS1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvZnVuY3Rpb25zL25lcHR1bmUtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDREQUErRTtBQVd4RSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBa0IsRUFBRSxFQUFFO0lBQ2xELE1BQU0sTUFBTSxHQUFHLElBQUksOEJBQWEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFFckUsTUFBTSxPQUFPLEdBQUcsSUFBSSxzQ0FBcUIsQ0FBQztRQUN4QyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07UUFDcEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1FBQ3BCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtRQUNwQixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7UUFDOUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO1FBQzlCLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxpQ0FBaUM7UUFDMUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCO0tBQ2hELENBQUMsQ0FBQztJQUVILElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRO2dCQUMzQixNQUFNLEVBQUUsU0FBUzthQUNsQixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLEtBQUssRUFBRSw0QkFBNEI7Z0JBQ25DLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTzthQUN2QixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUE7QUFoQ1ksUUFBQSxPQUFPLFdBZ0NuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5lcHR1bmVDbGllbnQsIFN0YXJ0TG9hZGVySm9iQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1uZXB0dW5lJztcblxuaW50ZXJmYWNlIExvYWRlckV2ZW50IHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIGZvcm1hdDogc3RyaW5nO1xuICByZWdpb246IHN0cmluZztcbiAgZmFpbE9uRXJyb3I6IHN0cmluZztcbiAgcGFyYWxsZWxpc206IHN0cmluZztcbiAgdXBkYXRlU2luZ2xlQ2FyZGluYWxpdHlQcm9wZXJ0aWVzOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBMb2FkZXJFdmVudCkgPT4ge1xuICBjb25zdCBjbGllbnQgPSBuZXcgTmVwdHVuZUNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB9KTtcbiAgXG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgU3RhcnRMb2FkZXJKb2JDb21tYW5kKHtcbiAgICBzb3VyY2U6IGV2ZW50LnNvdXJjZSxcbiAgICBmb3JtYXQ6IGV2ZW50LmZvcm1hdCxcbiAgICByZWdpb246IGV2ZW50LnJlZ2lvbixcbiAgICBmYWlsT25FcnJvcjogZXZlbnQuZmFpbE9uRXJyb3IsXG4gICAgcGFyYWxsZWxpc206IGV2ZW50LnBhcmFsbGVsaXNtLFxuICAgIHVwZGF0ZVNpbmdsZUNhcmRpbmFsaXR5UHJvcGVydGllczogZXZlbnQudXBkYXRlU2luZ2xlQ2FyZGluYWxpdHlQcm9wZXJ0aWVzLFxuICAgIGlhbVJvbGVBcm46IHByb2Nlc3MuZW52Lk5FUFRVTkVfTE9BREVSX1JPTEVfQVJOXG4gIH0pO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjbGllbnQuc2VuZChjb21tYW5kKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBsb2FkZXJJZDogcmVzcG9uc2UubG9hZGVySWQsXG4gICAgICAgIHN0YXR1czogJ1NUQVJURUQnXG4gICAgICB9KVxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzdGFydGluZyBsb2FkZXIgam9iOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBzdGFydCBsb2FkZXIgam9iJyxcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZVxuICAgICAgfSlcbiAgICB9O1xuICB9XG59ICJdfQ==