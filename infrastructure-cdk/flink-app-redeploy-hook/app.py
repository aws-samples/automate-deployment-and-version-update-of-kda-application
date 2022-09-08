import json
import os
import traceback

import boto3

asset_bucket_arn = os.environ["ASSET_BUCKET_ARN"]
kinesis_apps = boto3.client("kinesisanalyticsv2")
code_pipeline = boto3.client('codepipeline')


def put_job_success(job, message):
    """Notify CodePipeline of a successful job

    Args:
        job: The CodePipeline job ID
        message: A message to be logged relating to the job status

    Raises:
        Exception: Any exception thrown by .put_job_success_result()

    """
    print('Putting job success')
    print(message)
    code_pipeline.put_job_success_result(jobId=job)


def put_job_failure(job, message):
    """Notify CodePipeline of a failed job

    Args:
        job: The CodePipeline job ID
        message: A message to be logged relating to the job status

    Raises:
        Exception: Any exception thrown by .put_job_failure_result()

    """
    print('Putting job failure')
    print(message)
    code_pipeline.put_job_failure_result(jobId=job, failureDetails={'message': message, 'type': 'JobFailed'})


def lambda_handler(event, context):
    print(json.dumps(event))
    # Extract the Job ID
    job_id = event['CodePipeline.job']['id']

    if "APP_NAME" in event:
        app_name = event["APP_NAME"]
    else:
        app_name = os.environ["APP_NAME"]

    if "FILE_KEY" in event:
        file_key = event["FILE_KEY"]
    else:
        file_key = os.environ["FILE_KEY"]

    try:
        token = kinesis_apps.describe_application(ApplicationName=app_name)["ApplicationDetail"]["ConditionalToken"]
        kinesis_apps.update_application(ApplicationName=app_name,
                                        ApplicationConfigurationUpdate={
                                            "ApplicationCodeConfigurationUpdate": {
                                                "CodeContentUpdate": {
                                                    "S3ContentLocationUpdate": {"BucketARNUpdate": asset_bucket_arn,
                                                                                "FileKeyUpdate": file_key}}}

                                        }, ConditionalToken=token)
        put_job_success(job_id, "Success")
    except Exception as e:
        traceback.print_exc()
        put_job_failure(job_id, 'Function exception: ' + str(e))


if __name__ == '__main__':
    lambda_handler({}, {})
