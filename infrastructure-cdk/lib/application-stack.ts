import {Aws, Fn, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {APPLICATION_NAME, ASSET_BUCKET_EXPORT_NAME} from "./shared-vars";
import {Stream, StreamEncryption, StreamMode} from "aws-cdk-lib/aws-kinesis";
import {Code, Function, Runtime} from "aws-cdk-lib/aws-lambda";
import * as kda from "@aws-cdk/aws-kinesisanalytics-flink-alpha";

export class ApplicationStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const assetBucket = Bucket.fromBucketName(this, 'imported-asset-bucket', Fn.importValue(ASSET_BUCKET_EXPORT_NAME));

        const stream = new Stream(this, 'raw', {
            streamMode: StreamMode.PROVISIONED,
            shardCount: 1,
            encryption: StreamEncryption.MANAGED
        });

        const dataSourceFn = new Function(this, 'data-source', {
            code: Code.fromAsset("data-source-function"),
            handler: "app.lambda_handler",
            runtime: Runtime.PYTHON_3_9,
            environment: {
                STREAM_NAME: stream.streamName
            }
        });

        stream.grantWrite(dataSourceFn);

        const application = new kda.Application(this, 'app', {
                applicationName: APPLICATION_NAME,
                code: kda.ApplicationCode.fromBucket(assetBucket, "jars/" + APPLICATION_NAME + "-latest.jar"),
                runtime: kda.Runtime.FLINK_1_13,
                propertyGroups: {
                    "KinesisReader": {
                        "input.stream.name": stream.streamName,
                        "aws.region": Aws.REGION,
                        "flink.stream.initpos": "LATEST"
                    },
                },
                snapshotsEnabled: false,
                parallelismPerKpu: 1
            }
        );

        stream.grantRead(application);

    }
}
