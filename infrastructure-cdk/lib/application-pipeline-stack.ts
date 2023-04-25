import {Aws, CfnOutput, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {JavaBuildPipeline} from "./constructs/java-build-pipeline";
import {BlockPublicAccess, Bucket, BucketEncryption} from "aws-cdk-lib/aws-s3";
import {APPLICATION_NAME, ASSET_BUCKET_EXPORT_NAME, BUILD_FOR_RUNTIME, SOURCE_CODE_ZIP} from "./shared-vars";
import {ApplicationRuntime} from "./constructs/application-runtime";
import {PythonBuildPipeline} from "./constructs/python-build-pipeline";

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

        let buildPipeline;
        // @ts-ignore
        if (BUILD_FOR_RUNTIME == ApplicationRuntime.JAVA)
            buildPipeline = new JavaBuildPipeline(this, 'java-app', {
                appName: APPLICATION_NAME,
                deployBucket: artifactBucket,
                repositoryName: APPLICATION_NAME,
                projectRoot: SOURCE_CODE_ZIP.replace(".zip", "") + "/" + APPLICATION_NAME
            });
        else
            buildPipeline = new PythonBuildPipeline(this, 'python-app', {
                appName: APPLICATION_NAME,
                deployBucket: artifactBucket,
                repositoryName: APPLICATION_NAME,
                projectRoot: SOURCE_CODE_ZIP.replace(".zip", "") + "/" + APPLICATION_NAME + "-python"
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

        new CfnOutput(this, 'ApplicationCodePipelineLink', {
            value: "https://console.aws.amazon.com/codesuite/codepipeline/pipelines/" + buildPipeline.pipeline.pipelineName + "/view?region=" + Aws.REGION,
            description: "Application AWS CodePipeline Link"
        });

    }
}
