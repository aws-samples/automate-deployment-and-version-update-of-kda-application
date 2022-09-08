import {Fn, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {CodePipeline, CodePipelineSource, ShellStep} from "aws-cdk-lib/pipelines";
import {RealtimeApplication} from "./real-time-application";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {BUCKET_NAME_OUTPUT} from "aws-cdk/lib";
import {SOURCE_CODE_ZIP} from "./shared-vars";

export class InfraPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const artifactBucket = Bucket.fromBucketName(this, 'artifactBucket-import', Fn.importValue(BUCKET_NAME_OUTPUT))

        const pipeline = new CodePipeline(this, 'Pipeline', {
            selfMutation: false,
            synth: new ShellStep('Synth', {
                input: CodePipelineSource.s3(artifactBucket, SOURCE_CODE_ZIP),
                commands: [
                    "cd infrastructure-cdk",
                    "npm ci",
                    "npm run build",
                    "npm cdk synth"
                ],
                primaryOutputDirectory: 'infrastructure-cdk/cdk.out'
            })
        });

        pipeline.addStage(new RealtimeApplication(this, 'app'));
    }
}
