interface LoaderEvent {
    source: string;
    format: string;
    region: string;
    failOnError: string;
    parallelism: string;
    updateSingleCardinalityProperties: string;
}
export declare const handler: (event: LoaderEvent) => Promise<{
    statusCode: number;
    body: string;
}>;
export {};
