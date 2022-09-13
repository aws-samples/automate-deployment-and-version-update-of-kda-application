import {Aws, CfnOutput, Fn, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {CodePipeline, CodePipelineSource, ShellStep} from "aws-cdk-lib/pipelines";
import {RealtimeApplication} from "./real-time-application";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {APPLICATION_NAME, ASSET_BUCKET_EXPORT_NAME, SOURCE_CODE_ZIP} from "./shared-vars";

export class InfraPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const artifactBucket = Bucket.fromBucketName(this, 'artifactBucket-import', Fn.importValue(ASSET_BUCKET_EXPORT_NAME))

        const pipelineName = "blog-infra-pipeline-" + Aws.ACCOUNT_ID + "-" + Aws.REGION;
        const pipeline = new CodePipeline(this, 'Pipeline', {
            selfMutation: false,
            pipelineName: pipelineName,
            synth: new ShellStep('Synth', {
                input: CodePipelineSource.s3(artifactBucket, SOURCE_CODE_ZIP),
                commands: [
                    "cd infrastructure-cdk",
                    "npm ci",
                    "npm run build",
                    "npx cdk synth"
                ],
                primaryOutputDirectory: 'infrastructure-cdk/cdk.out'
            })
        });

        pipeline.addStage(new RealtimeApplication(this, 'app'));

        new CfnOutput(this, 'InfraCodePipelineLink', {
            value: "https://console.aws.amazon.com/codesuite/codepipeline/pipelines/" + pipelineName + "/view?region=" + Aws.REGION,
            description: "Infrastructure AWS CodePipeline Link"
        });

        new CfnOutput(this, 'KDAApplicationLink', {
            value: "https://console.aws.amazon.com/kinesisanalytics/home?region=" + Aws.REGION + "#/application/" + APPLICATION_NAME + "/details/monitoring",
            description: "Amazon Kinesis Data Analytics application Link"
        });
    }
}
