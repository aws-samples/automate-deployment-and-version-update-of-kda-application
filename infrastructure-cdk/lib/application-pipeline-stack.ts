import {Aws, CfnOutput, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {JavaBuildPipeline} from "./constructs/java-build-pipeline";
import {BlockPublicAccess, Bucket, BucketEncryption} from "aws-cdk-lib/aws-s3";
import {APPLICATION_NAME, ASSET_BUCKET_EXPORT_NAME} from "./shared-vars";

export class ApplicationPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const artifactBucket = new Bucket(this, 'ArtifactBucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            encryption: BucketEncryption.S3_MANAGED,
            versioned: true,
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY
        });

        new JavaBuildPipeline(this, 'java-app', {
            appName: APPLICATION_NAME,
            deployBucket: artifactBucket,
            repositoryName: APPLICATION_NAME
        });

        new CfnOutput(this, 'ArtifactBucketName', {
            value: artifactBucket.bucketName,
            description: "Artifact Bucket name storing application binaries",
            exportName: ASSET_BUCKET_EXPORT_NAME
        });

        new CfnOutput(this, 'ArtifactBucketLink', {
            value: "https://s3.console.aws.amazon.com/s3/buckets/" + artifactBucket.bucketName + "?region=" + Aws.REGION + "&tab=objects",
            description: "Artifact Bucket Link"
        });

    }
}
