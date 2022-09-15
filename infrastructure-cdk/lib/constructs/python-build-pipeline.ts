import {Construct} from "constructs";
import {BuildSpec, LinuxBuildImage, PipelineProject} from "aws-cdk-lib/aws-codebuild";
import {IBucket} from "aws-cdk-lib/aws-s3";
import {Artifact, Pipeline} from "aws-cdk-lib/aws-codepipeline";
import {
    CodeBuildAction,
    LambdaInvokeAction,
    ManualApprovalAction,
    S3DeployAction,
    S3SourceAction
} from "aws-cdk-lib/aws-codepipeline-actions";
import {Code, Function, Runtime} from "aws-cdk-lib/aws-lambda";
import {Aws, Duration} from "aws-cdk-lib";
import {PolicyStatement} from "aws-cdk-lib/aws-iam";
import {SOURCE_CODE_ZIP} from "../shared-vars";


interface PythonBuildPipelineProps {
    appName: string
    repositoryName: string
    deployBucket: IBucket
    projectRoot?: string
    deployBucketBasePath?: string
}

export class PythonBuildPipeline extends Construct {
    readonly pipeline: Pipeline

    constructor(scope: Construct, id: string, props: PythonBuildPipelineProps) {
        super(scope, id);

        let directory = ".";
        let s3BasePath = "python-binaries";
        if (props.projectRoot) {
            directory = props.projectRoot;
        }
        if (props.deployBucketBasePath) {
            s3BasePath = props.deployBucketBasePath
        }

        const sourceAsset = new Artifact();
        const defaultBuildSpec = BuildSpec.fromObject({
            version: '0.2',
            phases: {
                install: {
                    "runtime-versions": {
                        "python": "3.x"
                    }
                },
                build: {
                    commands: [
                        `cd ${directory}`,
                        'mkdir dependencies',
                        'pip3 install -r requirements.txt -t dependencies',
                        `mkdir -p ${s3BasePath}`,
                        `zip -r ${s3BasePath}/${props.appName}-latest.zip *.py lib/* dependencies`
                    ]
                }
            },
            artifacts: {
                files: [
                    `${s3BasePath}/${props.appName}.zip`
                ],
                'discard-paths': true,
                'base-directory': directory
            }
        });

        const project = new PipelineProject(this, 'Pipeline', {
            environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: defaultBuildSpec
        });

        const buildOutput = new Artifact();

        this.pipeline = new Pipeline(this, 'CodePipeline', {
            stages: [
                // In real world use code snippet like below to work with repository
                //
                // {
                //     stageName: "source", actions: [new GitHubSourceAction({
                //         actionName: "CodeCheckout",
                //         oauthToken: SecretValue.secretsManager("github-secret"),
                //         output: sourceAsset,
                //         owner: "some-owner",
                //         repo: props.repositoryName
                //     })]
                // },
                {
                    stageName: "source", actions: [new S3SourceAction({
                        output: sourceAsset,
                        actionName: "Checkout",
                        bucket: props.deployBucket,
                        bucketKey: SOURCE_CODE_ZIP
                    })]
                },
                {
                    stageName: "build", actions: [new CodeBuildAction({
                        input: sourceAsset, actionName: "CodeBuild", project: project, outputs: [buildOutput]
                    })]
                }, {
                    stageName: "saveArtifact", actions: [new S3DeployAction({
                        bucket: props.deployBucket,
                        actionName: "SaveArtifact",
                        input: buildOutput,
                        extract: true
                    })]
                }, {
                    stageName: "approval",
                    actions: [new ManualApprovalAction({
                        actionName: "Manual"
                    })]
                }]
        });

        const versionUpdateFn = new Function(this, 'version-update-fn', {
            code: Code.fromAsset('flink-app-redeploy-hook'),
            handler: "app.lambda_handler",
            runtime: Runtime.PYTHON_3_9,
            environment: {
                ASSET_BUCKET_ARN: props.deployBucket.bucketArn,
                FILE_KEY: s3BasePath + "/" + props.appName + "-latest.zip",
                APP_NAME: props.appName
            },
            timeout: Duration.minutes(1)
        });

        versionUpdateFn.addToRolePolicy(new PolicyStatement({
            actions: ["kinesisanalytics:DescribeApplication", "kinesisanalytics:UpdateApplication"],
            resources: ["arn:aws:kinesisanalytics:" + Aws.REGION + ":" + Aws.ACCOUNT_ID + ":application/" + props.appName]
        }));
        versionUpdateFn.addToRolePolicy(new PolicyStatement({
            resources: ["*"],
            actions: ["codepipeline:PutJobSuccessResult", "codepipeline:PutJobFailureResult"]
        }));

        this.pipeline.addStage({
            stageName: "deploy", actions: [new LambdaInvokeAction({
                actionName: "Deploy",
                lambda: versionUpdateFn
            })]
        });

    }
}