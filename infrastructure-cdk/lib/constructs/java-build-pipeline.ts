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


interface JavaBuildPipelineProps {
    appName: string
    repositoryName: string
    deployBucket: IBucket
    projectRoot?: string
    deployBucketBasePath?: string
}

export class JavaBuildPipeline extends Construct {
    readonly pipeline: Pipeline

    constructor(scope: Construct, id: string, props: JavaBuildPipelineProps) {
        super(scope, id);

        let directory = ".";
        let s3BasePath = "jars";
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
                        "java": "corretto17"
                    }
                },
                build: {
                    commands: [
                        `cd ${directory}`,
                        'mvn clean package -B',
                        `mkdir -p ${s3BasePath}`,
                        `cp target/*.jar ${s3BasePath}/`
                    ]
                }
            },
            artifacts: {
                files: [
                    `${s3BasePath}/*.jar`
                ],
                'discard-paths': false,
                'base-directory': directory
            }
        });

        const project = new PipelineProject(this, 'Pipeline', {
            environment: {
                buildImage: LinuxBuildImage.STANDARD_6_0
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
                FILE_KEY: s3BasePath + "/" + props.appName + "-latest.jar",
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