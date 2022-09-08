import {Aws, CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {JavaBuildPipeline} from "./constructs/java-build-pipeline";
import {BlockPublicAccess, Bucket, BucketEncryption} from "aws-cdk-lib/aws-s3";
import {ASSET_BUCKET_EXPORT_NAME, REPOSITORY_FILE_PATH} from "./shared-vars";

export class ApplicationPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const artefactBucket = new Bucket(this, 'ArtefactBucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            encryption: BucketEncryption.S3_MANAGED
        });

        new JavaBuildPipeline(this, 'java-app', {
            deployBucket: artefactBucket, repositoryName: REPOSITORY_FILE_PATH
        });

        new CfnOutput(this, 'AssetBucketName', {
            value: artefactBucket.bucketName,
            description: "Artefact Bucket name storing application binaries",
            exportName: ASSET_BUCKET_EXPORT_NAME
        });

        new CfnOutput(this, 'AssetBucketLink', {
            value: "https://s3.console.aws.amazon.com/s3/buckets/" + artefactBucket.bucketName + "?region=" + Aws.REGION + "&tab=objects",
            description: "Artefact Bucket Link"
        });

    }
}
