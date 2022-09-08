import {Aws, Fn, Stage, StageProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import {Code, Function, Runtime} from "aws-cdk-lib/aws-lambda";
import {Stream, StreamEncryption, StreamMode} from "aws-cdk-lib/aws-kinesis";
import * as kda from "@aws-cdk/aws-kinesisanalytics-flink-alpha";
import {APPLICATION_NAME, ASSET_BUCKET_EXPORT_NAME} from "./shared-vars";
import {Bucket} from "aws-cdk-lib/aws-s3";


export class RealtimeApplication extends Stage {
    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        const assetBucket = Bucket.fromBucketName(this, 'imported-asset-bucket', Fn.importValue(ASSET_BUCKET_EXPORT_NAME));

        const stream = new Stream(this, 'raw', {
            streamMode: StreamMode.PROVISIONED,
            shardCount: 1,
            encryption: StreamEncryption.MANAGED
        });

        const dataSourceFn = new Function(this, 'data-source', {
            code: Code.fromInline(
                "import boto3\n" +
                "import os\n\n" +
                "kinesis = boto3.client('kinesis')\n\n" +
                "def lambda_handler(event, context):\n" +
                "   kinesis.put_record(StreamName=os.environ['STREAM_NAME']), Data=b'{\"message\":\"This is the test message from the lambda\"}', PartitionKey='default')\n"
            ),
            handler: "index.lambda_handler",
            runtime: Runtime.PYTHON_3_9,
            environment: {
                STREAM_NAME: stream.streamName
            }
        });

        stream.grantWrite(dataSourceFn);

        const application = new kda.Application(this, 'app', {
                code: kda.ApplicationCode.fromBucket(assetBucket, "jars/" + APPLICATION_NAME + "-1.0.0.jar"),
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